// src/components/NewChatModal.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { rtdb } from "../firebase";
import {
  ref,
  push,
  set,
  query,
  orderByChild,
  equalTo,
  get,
} from "firebase/database";

/**
 * Create a new chat. If a chat with the same name and exact same participants exists,
 * navigate to it instead of creating a duplicate.
 */

export default function NewChatModal({ onClose }) {
  const { user } = useAuth();
  const [chatName, setChatName] = useState("");
  const [participantUsernames, setParticipantUsernames] = useState("");
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  const createChat = async (e) => {
    e && e.preventDefault();
    setErr(null);

    const name = (chatName || "").trim();
    if (!name) {
      setErr("Please enter a chat name.");
      return;
    }

    let participants = (participantUsernames || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // ensure current user included
    if (!participants.includes(user.username)) participants.push(user.username);

    try {
      // Resolve usernames → user ids
      const usersRef = ref(rtdb, "users");
      const usersSnap = await get(usersRef);
      const usersVal = (usersSnap && usersSnap.val()) || {};
      const usernameToId = {};
      Object.entries(usersVal).forEach(([uid, u]) => {
        if (u && u.username) usernameToId[u.username] = uid;
      });

      const found = [];
      for (const uname of participants) {
        if (!usernameToId[uname]) {
          throw new Error(`User not found: ${uname}`);
        }
        found.push({ id: usernameToId[uname], username: uname });
      }

      // Check if a chat already exists with same name + same participant set
      const chatsRef = ref(rtdb, "chats");
      const chatsSnap = await get(chatsRef);
      const chatsVal = (chatsSnap && chatsSnap.val()) || {};
      const participantIdsSorted = found.map(f => f.id).sort().join("|");
      for (const [cid, c] of Object.entries(chatsVal)) {
        const cParticipants = c.participants || [];
        const cPartSorted = Array.isArray(cParticipants) ? cParticipants.slice().sort().join("|") : "";
        const sameName = (c.name || "").trim() === name;
        if (sameName && cPartSorted === participantIdsSorted) {
          // existing exact match — navigate to it
          if (onClose) onClose();
          navigate(`/chats/${cid}`);
          return;
        }
      }

      // create chat
      const newChatRef = push(chatsRef);
      const chatId = newChatRef.key;
      const payload = {
        name,
        participants: found.map((f) => f.id),
        participantUsernames: found.map((f) => f.username),
        createdAt: Date.now(),
        createdBy: user.id,
        lastMessage: null,
        lastMessageAt: null,
      };
      await set(newChatRef, payload);

      // add to userChats for each participant
      await Promise.all(
        found.map((p) => set(ref(rtdb, `userChats/${p.id}/${chatId}`), { chatId, addedAt: Date.now() }))
      );

      if (onClose) onClose();
      navigate(`/chats/${chatId}`);
    } catch (error) {
      console.error("createChat error", error);
      setErr((error && error.message) || "Failed to create chat.");
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={() => onClose && onClose()} />
      <div className="modal">
        <h3>New Chat</h3>
        <form onSubmit={createChat} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label>
            Chat name
            <input value={chatName} onChange={(e) => setChatName(e.target.value)} />
          </label>

          <label>
            Participants (comma-separated usernames)
            <input value={participantUsernames} onChange={(e) => setParticipantUsernames(e.target.value)} />
          </label>

          {err && <div style={{ color: "salmon", marginBottom: 8 }}>{err}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" type="submit">Create</button>
            <button className="btn secondary" type="button" onClick={() => onClose && onClose()}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}
