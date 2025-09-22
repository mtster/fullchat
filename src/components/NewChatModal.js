// src/components/NewChatModal.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { getApp } from "firebase/app";
import {
  getDatabase,
  ref,
  push,
  set,
  query,
  orderByChild,
  equalTo,
  get,
} from "firebase/database";

export default function NewChatModal({ onClose }) {
  const { user } = useAuth();
  const [chatName, setChatName] = useState("");
  const [participantUsernames, setParticipantUsernames] = useState("");
  const [err, setErr] = useState(null);
  const navigate = useNavigate();
  const app = getApp();
  const rdb = getDatabase(app);

  const createChat = async (e) => {
    e && e.preventDefault();
    setErr(null);

    const name = (chatName || "").trim();
    if (!name) {
      setErr("Please enter a chat name.");
      return;
    }

    let arr = (participantUsernames || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!arr.includes(user.username)) arr.push(user.username);

    try {
      const usersRef = ref(rdb, "users");
      const foundUsers = [];
      for (let i = 0; i < arr.length; i++) {
        const u = arr[i];
        const q = query(usersRef, orderByChild("username"), equalTo(u));
        const snap = await get(q);
        if (!snap.exists()) {
          setErr(`User not found: ${u}`);
          return;
        }
        const val = snap.val();
        const firstKey = Object.keys(val)[0];
        foundUsers.push({ id: firstKey, username: val[firstKey].username });
      }

      const chatsRef = ref(rdb, "chats");
      const newChatRef = push(chatsRef);
      const chatId = newChatRef.key;
      const payload = {
        name,
        participants: foundUsers.map((f) => f.id),
        participantUsernames: foundUsers.map((f) => f.username),
        createdAt: Date.now(),
        lastMessage: "",
        lastMessageAt: Date.now(),
      };
      await set(newChatRef, payload);

      for (const p of foundUsers) {
        await set(ref(rdb, `userChats/${p.id}/${chatId}`), { chatId, addedAt: Date.now() });
      }

      onClose && onClose();
      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error("createChat error", error);
      setErr((error && error.message) || "Failed to create chat.");
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={() => onClose && onClose()} />
      <div className="modal" style={{ background: "#f3f7fb" }}>
        <h3>New Chat</h3>
        <form onSubmit={createChat}>
          <div className="field">
            <label>Chat name</label>
            <input value={chatName} onChange={(e) => setChatName(e.target.value)} required />
          </div>

          <div className="field">
            <label>Invite by username (comma separated)</label>
            <input
              value={participantUsernames}
              onChange={(e) => setParticipantUsernames(e.target.value)}
              placeholder="alice, bob"
            />
            <div className="meta" style={{ marginTop: 6 }}>
              Your username will be added automatically.
            </div>
          </div>

          {err && <div style={{ color: "salmon", marginBottom: 8 }}>{err}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" type="submit">Create</button>
            <button className="btn secondary" type="button" onClick={() => onClose && onClose()}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
