// src/components/ChatItem.js
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function ChatItem({ chat }) {
  const navigate = useNavigate();
  const location = useLocation();

  const openChat = () => {
    localStorage.setItem("lastChat", chat.id);
    navigate(`/chats/${chat.id}`);
  };

  const ts = chat.timestamp && chat.timestamp.toDate ? chat.timestamp.toDate() : (chat.timestamp ? new Date(chat.timestamp.seconds * 1000) : null);
  const time = ts ? ts.toLocaleString() : "";

  return (
    <div className="chat-item" onClick={openChat}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div className="chat-title">{chat.chatName || "Chat"}</div>
        <div style={{fontSize:12, color:"var(--muted)"}}>{time}</div>
      </div>
      <div className="chat-preview">{chat.lastMessage || "No messages yet"}</div>
    </div>
  );
}
