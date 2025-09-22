// src/components/NewChatModal.js
import React, { useState } from "react";
import { db, serverTimestamp } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "./AuthProvider";
import { useNavigate } from "react-router-dom";

export default function NewChatModal({ onClose }) {
  const { user } = useAuth();
  const [chatName, setChatName] = useState("");
  const [participantUsernames, setParticipantUsernames] = useState("");
  const navigate = useNavigate();
  const [err, setErr] = useState(null);

  const createChat = async (e) => {
    e && e.preventDefault();
    setErr(null);

    const name = (chatName || "").trim();
    if (!name) {
      setErr("Please enter a chat name.");
      return;
    }

    // parse usernames, include current username automatically
    let arr = (participantUsernames || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Remove duplicates and ensure current user is included
    arr = Array.from(new Set(arr));
    if (!arr.includes(user.username)) {
      arr.push(user.username);
    }

    try {
      // find user docs for provided usernames
      const usersRef = collection(db, "users");

      // Firestore supports 'in' queries up to 10 items. To be robust:
      let foundUsers = [];
      if (arr.length === 0) {
        setErr("You must invite at least yourself.");
        return;
      }

      // We will query for chunks of up to 10
      for (let i = 0; i < arr.length; i += 10) {
        const chunk = arr.slice(i, i + 10);
        const q = query(usersRef, where("username", "in", chunk));
        const snap = await getDocs(q);
        snap.forEach((ds) => {
          const d = ds.data();
          foundUsers.push({ id: ds.id, username: d.username });
        });
      }

      // Check that all requested usernames were found
      const foundUsernames = foundUsers.map((u) => u.username);
      const notFound = arr.filter((u) => !foundUsernames.includes(u));
      if (notFound.length > 0) {
        setErr(`User(s) not found: ${notFound.join(", ")}`);
        return;
      }

      // Create chat doc
      const chatsRef = collection(db, "chats");
      const payload = {
        name,
        participants: foundUsers.map((u) => u.id),
        participantUsernames: foundUsers.map((u) => u.username),
        createdAt: serverTimestamp(),
        lastMessage: "",
        lastMessageAt: serverTimestamp()
      };

      const chatDocRef = await addDoc(chatsRef, payload);

      // After creating, close modal and navigate to the chat view
      onClose && onClose();
      navigate(`/chat/${chatDocRef.id}`);
    } catch (error) {
      console.error("NewChatModal createChat error", error);
      setErr((error && error.message) || "Failed to create chat.");
    }
  };

  return (
    <div className="modal">
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
            Include usernames separated by commas. Your username will be added automatically.
          </div>
        </div>

        {err && <div style={{ color: "salmon", marginBottom: 8 }}>{err}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit">Create</button>
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
