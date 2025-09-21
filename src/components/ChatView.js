// src/components/ChatView.js
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { db, serverTimestamp } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  startAfter
} from "firebase/firestore";
import { useAuth } from "./AuthProvider";

export default function ChatView() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef();
  const lastVisibleRef = useRef(null);

  useEffect(() => {
    if (!chatId) return;
    // fetch chat meta doc
    const chatRef = doc(db, "chats", chatId);
    let unsubChat = () => {};
    const loadChat = async () => {
      const snap = await getDoc(chatRef);
      if (snap.exists()) {
        setChat({ id: snap.id, ...snap.data() });
      } else {
        setChat(null);
      }
      unsubChat = onSnapshot(chatRef, s => {
        if (s.exists()) setChat({ id: s.id, ...s.data() });
      });
    };
    loadChat();
    return () => {
      try { unsubChat(); } catch(e){}
    };
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    // real-time messages (most recent 50)
    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, where("chatId", "==", chatId), orderBy("timestamp", "desc"), limit(50));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // since we queried desc, reverse for display
      docs.reverse();
      setMessages(docs);
      lastVisibleRef.current = snap.docs[snap.docs.length - 1];
      setHasMore(snap.docs.length === 50); // if equal to limit, assume there may be more
      // scroll to bottom
      setTimeout(()=> {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    });
    return () => unsub();
  }, [chatId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const messagesRef = collection(db, "messages");
    const newMsg = {
      chatId,
      senderId: user.id,
      message: input.trim(),
      timestamp: serverTimestamp()
    };
    await addDoc(messagesRef, newMsg);
    // update chat lastMessage & timestamp
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { lastMessage: input.trim(), timestamp: serverTimestamp() });
    setInput("");
    // after sending, lastMessage will update via onSnapshot, and left chat list updates by its subscription
  };

  const loadOlder = async () => {
    if (!hasMore || loadingOlder) return;
    setLoadingOlder(true);
    const messagesRef = collection(db, "messages");
    // query older than lastVisibleRef (which is oldest currently loaded)
    if (!lastVisibleRef.current) {
      setLoadingOlder(false);
      return;
    }
    const q = query(messagesRef, where("chatId", "==", chatId), orderBy("timestamp", "desc"), startAfter(lastVisibleRef.current), limit(50));
    const snap = await getDocs(q);
    if (snap.empty) {
      setHasMore(false);
    } else {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setMessages(prev => [...docs, ...prev]);
      lastVisibleRef.current = snap.docs[snap.docs.length - 1];
      setHasMore(snap.docs.length === 50);
    }
    setLoadingOlder(false);
  };

  return (
    <>
      <div style={{padding:12, borderBottom:"1px solid rgba(255,255,255,0.02)"}}>
        <div style={{fontSize:16, fontWeight:700}}>{chat ? chat.chatName : "Chat"}</div>
        <div style={{color:"var(--muted)", fontSize:12}}>
          {chat ? (chat.participants && chat.participants.length ? `${chat.participants.length} participants` : "") : ""}
        </div>
      </div>

      <div ref={scrollRef} className="messages">
        {hasMore && <div style={{textAlign:"center"}}><button className="btn secondary" onClick={loadOlder}>{loadingOlder ? "Loading..." : "Load older messages"}</button></div>}
        {messages.map(m => (
          <div key={m.id} className={`message ${m.senderId === user.id ? "msg-me" : "msg-other"}`}>
            <div style={{fontSize:12, opacity:0.9}}>{m.message}</div>
            <div style={{fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:6, textAlign:"right"}}>
              {m.timestamp && m.timestamp.toDate ? m.timestamp.toDate().toLocaleString() : ""}
            </div>
          </div>
        ))}
      </div>

      <form className="input-area" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Write a message..."
          value={input}
          onChange={e=>setInput(e.target.value)} />
        <button className="btn" type="submit">Send</button>
      </form>
    </>
  );
}
