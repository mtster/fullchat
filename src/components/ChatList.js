// src/components/ChatList.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { useAuth } from "./AuthProvider";
import ChatItem from "./ChatItem";
import { useNavigate } from "react-router-dom";
import NewChatModal from "./NewChatModal";

export default function ChatList() {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("participants", "array-contains", user.id), orderBy("lastMessageAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => {
        arr.push({ id: d.id, ...d.data() });
      });
      setChats(arr);
      setLoading(false);
    }, (err) => {
      console.error("ChatList snapshot error", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "12px auto", padding: 12 }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <strong>FRBS Chat</strong>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Logged in as <strong>{user.username}</strong></div>
          <button className="btn" onClick={() => setShowNewChat(true)}>New chat</button>
          <button className="btn secondary" onClick={() => { logout(); navigate("/login"); }}>Logout</button>
        </div>
      </div>

      {/* Chat list */}
      <div>
        {loading && <div>Loading chats…</div>}
        {!loading && chats.length === 0 && (
          <div style={{ padding: 20, color: "#999" }}>
            You have no chats yet. Click “New chat” to start a conversation.
          </div>
        )}

        {!loading && chats.length > 0 && (
          <div className="chat-list">
            {chats.map((c) => (
              <ChatItem key={c.id} chat={c} />
            ))}
          </div>
        )}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </div>
  );
}
