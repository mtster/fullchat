// src/components/ChatView.js
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { getApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set } from "firebase/database";

export default function ChatView() {
  const { id } = useParams(); // chat id
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const navigate = useNavigate();
  const scrollRef = useRef();
  const app = getApp();
  const rdb = getDatabase(app);

  useEffect(() => {
    if (!id) return;
    // listen for chat data
    const chatRef = ref(rdb, `chats/${id}`);
    const unsubChat = onValue(chatRef, (snap) => {
      setChat(snap.exists() ? snap.val() : null);
    });

    // listen for messages under messages/{chatId}
    const messagesRef = ref(rdb, `messages/${id}`);
    const unsubMsg = onValue(messagesRef, (snap) => {
      const val = snap.val();
      if (!val) {
        setMessages([]);
        return;
      }
      // convert to ordered array by key order (or timestamp if stored)
      const arr = Object.keys(val).map((k) => ({ id: k, ...(val[k] || {}) }));
      arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(arr);
      // auto-scroll
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    });

    return () => {
      unsubChat && unsubChat();
      unsubMsg && unsubMsg();
    };
  }, [id]);

  if (!user) {
    return null;
  }

  const sendMessage = async (e) => {
    e && e.preventDefault();
    const txt = (text || "").trim();
    if (!txt) return;
    const messagesRef = ref(rdb, `messages/${id}`);
    const newMsgRef = push(messagesRef);
    await set(newMsgRef, {
      senderId: user.id,
      senderUsername: user.username,
      text: txt,
      createdAt: Date.now(),
    });

    // update chat lastMessage / lastMessageAt
    const chatRef = ref(rdb, `chats/${id}`);
    await set(ref(rdb, `chats/${id}/lastMessage`), txt).catch(()=>{});
    await set(ref(rdb, `chats/${id}/lastMessageAt`), Date.now()).catch(()=>{});

    setText("");
  };

  return (
    <div style={{ maxWidth: 1000, margin: "8px auto", padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <button className="btn" onClick={() => navigate(-1)}>Back</button>
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          {chat ? chat.name : "Chat"}
        </div>
        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          {chat && chat.participantUsernames ? chat.participantUsernames.join(", ") : ""}
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, height: "60vh", overflowY: "auto", marginBottom: 12 }}>
        {messages.length === 0 && (
          <div style={{ color: "#777", textAlign: "center", marginTop: 24 }}>No messages yet — say hi 👋</div>
        )}
        {messages.map((m) => {
          const mine = m.senderId === user.id;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{
                maxWidth: "75%",
                padding: "8px 12px",
                borderRadius: 16,
                background: mine ? "#DCF8C6" : "#fff",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.03)"
              }}>
                <div style={{ fontSize: 14, marginBottom: 6 }}>{m.text}</div>
                <div style={{ fontSize: 11, color: "#999", textAlign: "right" }}>
                  {m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" />
        <button className="btn" type="submit">Send</button>
      </form>
    </div>
  );
}
