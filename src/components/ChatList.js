// src/components/ChatList.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { useAuth } from "./AuthProvider";
import ChatItem from "./ChatItem";
import { useNavigate, useLocation } from "react-router-dom";

export default function ChatList() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    // Subscribe to chats where user is a participant
    const chatsRef = collection(db, "chats");
    // Firestore doesn't support 'array-contains-any' with single element for live update of all user's chats
    // We'll use 'where("participants", "array-contains", user.id)'
    const q = query(chatsRef, where("participants", "array-contains", user.id), orderBy("timestamp", "desc"), limit(50));
    const unsub = onSnapshot(q, snapshot => {
      const arr = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setChats(arr);
      setLoading(false);
    }, err => {
      console.error("ChatList error", err);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  return (
    <div className="left" style={{display:"flex", flexDirection:"column"}}>
      <div className="header">
        <div style={{fontWeight:700}}>Chats</div>
      </div>
      <div className="chat-list">
        {loading && <div className="meta">Loading...</div>}
        {!loading && chats.length === 0 && <div className="meta">No chats yet. Create one with "New Chat".</div>}
        {chats.map(chat => (
          <ChatItem key={chat.id} chat={chat} />
        ))}
      </div>
    </div>
  );
}
