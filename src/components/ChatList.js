// src/components/ChatList.js
import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { useNavigate, Link } from "react-router-dom";
import { getApp } from "firebase/app";
import { getDatabase, ref, onValue, get } from "firebase/database";
import NewChatModal from "./NewChatModal";
import ChatItem from "./ChatItem";

export default function ChatList() {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const app = getApp();
  const rdb = getDatabase(app);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const userChatsRef = ref(rdb, `userChats/${user.id}`);
    const unsub = onValue(userChatsRef, async (snap) => {
      const val = snap.val();
      if (!val) {
        setChats([]);
        setLoading(false);
        return;
      }

      const chatIds = Object.keys(val);
      const promises = chatIds.map(async (cid) => {
        const chatSnap = await get(ref(rdb, `chats/${cid}`));
        if (!chatSnap.exists()) return null;
        return { id: cid, ...(chatSnap.val() || {}) };
      });

      const results = await Promise.all(promises);
      const filtered = results.filter(Boolean).sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
      setChats(filtered);
      setLoading(false);
    });

    return () => unsub();
  }, [user, rdb]);

  if (!user) return null;

  return (
    <div style={{ maxWidth: 1000, margin: "12px auto", padding: 12 }}>
      {/* Top bar - only here */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong>FRBS Chat</strong>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Signed in as <strong>{user.username}</strong></div>
          <button className="btn" onClick={() => setShowNewChat(true)}>New chat</button>
          <button className="btn secondary" onClick={() => { logout(); navigate("/#/login"); window.location.hash = "/login"; }}>Logout</button>
        </div>
      </div>

      {/* Chat list area */}
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
              <Link key={c.id} to={`/chats/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <ChatItem chat={c} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </div>
  );
}
