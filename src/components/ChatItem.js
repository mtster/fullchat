// src/components/ChatItem.js
import React from "react";

export default function ChatItem({ chat }) {
  const lastMsg = chat.lastMessage || "";
  const ts = chat.lastMessageAt ? new Date(chat.lastMessageAt) : null;
  const timeStr = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "12px 8px",
      borderBottom: "1px solid #eee",
      background: "transparent",
      cursor: "pointer"
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{chat.name || (chat.participantUsernames && chat.participantUsernames.join(", "))}</div>
        <div style={{ color: "#666", marginTop: 6, fontSize: 14 }}>
          {lastMsg ? (lastMsg.length > 60 ? lastMsg.slice(0, 60) + "…" : lastMsg) : "No messages yet"}
        </div>
      </div>
      <div style={{ marginLeft: 12, fontSize: 12, color: "#999" }}>{timeStr}</div>
    </div>
  );
}
