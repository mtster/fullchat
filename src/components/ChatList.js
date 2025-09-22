// src/components/ChatList.js
import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import { rtdb } from "../firebase";
import { ref, onValue, get } from "firebase/database";
import NewChatModal from "./NewChatModal";
import ChatItem from "./ChatItem";

export default function ChatList() {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const userChatsRef = ref(rtdb, `userChats/${user.id}`);

    const unsub = onValue(userChatsRef, async (snapshot) => {
      const val = snapshot.val() || {};
      const chatIds = Object.keys(val || {});
      // fetch chats
      try {
        const chatPromises = chatIds.map(async (cid) => {
          const snap = await get(ref(rtdb, `chats/${cid}`));
          if (!snap || !snap.exists()) return null;
          return { id: cid, ...snap.val() };
        });
        const results = (await Promise.all(chatPromises)).filter(Boolean);
        // sort by lastMessageAt desc
        results.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
        setChats(results);
      } catch (err) {
        console.error("ChatList: error fetching chats", err);
        setChats([]);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    };
  }, [user]);

  if (!user) return null;

  return (
    <div style={{ maxWidth: 1000, margin: "12px auto", padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong>FRBS Chat</strong>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Signed in as <strong>{user.username}</strong></div>
          <button className="btn" onClick={() => setShowNewChat(true)}>New chat</button>
          <button
            className="btn secondary"
            onClick={() => {
              logout();
              // go to login
              navigate("/login", { replace: true });
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 320 }}>
          {loading ? (
            <div>Loading chats...</div>
          ) : (
            <div className="chat-list">
              {chats.map((c) => (
                <Link key={c.id} to={`/chats/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <ChatItem chat={c} />
                </Link>
              ))}
              {chats.length === 0 && <div style={{ padding: 12, color: "#666" }}>No chats yet</div>}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          {/* main chat view is displayed by the router */}
        </div>
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </div>
  );
}
