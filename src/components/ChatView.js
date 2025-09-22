// src/components/ChatView.js
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { getApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, get } from "firebase/database";

const POSSIBLE_MESSAGE_PATHS = [
  (chatId) => `messages/${chatId}`,
  (chatId) => `chatMessages/${chatId}`,
  (chatId) => `chats/${chatId}/messages`,
  (chatId) => `messagesByChat/${chatId}`,
  (chatId) => `chats/${chatId}/messagesById`
];

export default function ChatView() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [listeningPath, setListeningPath] = useState(null);
  const app = getApp();
  const rdb = getDatabase(app);
  const scrollRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    if (!chatId) return;
    // load chat metadata
    const chatRef = ref(rdb, `chats/${chatId}`);
    const unsubChat = onValue(chatRef, (snap) => {
      setChat(snap.exists() ? snap.val() : null);
    });

    // Detect which messages path actually contains messages
    let activeUnsub = null;
    async function findAndListen() {
      for (const pathFn of POSSIBLE_MESSAGE_PATHS) {
        const p = pathFn(chatId);
        try {
          const snap = await get(ref(rdb, p));
          if (snap.exists()) {
            // attach listener to this path
            setListeningPath(p);
            activeUnsub = onValue(ref(rdb, p), (mSnap) => {
              const v = mSnap.val();
              if (!v) {
                setMessages([]);
                return;
              }
              const arr = Object.keys(v).map((k) => ({ id: k, ...(v[k] || {}) }));
              arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
              setMessages(arr);
              setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }, 40);
            });
            return;
          }
        } catch (err) {
          console.warn("error checking path", p, err);
        }
      }
      // if none exist, still attach to default path so new messages show up for this chat
      const defaultPath = `messages/${chatId}`;
      setListeningPath(defaultPath);
      activeUnsub = onValue(ref(rdb, defaultPath), (mSnap) => {
        const v = mSnap.val();
        if (!v) {
          setMessages([]);
          return;
        }
        const arr = Object.keys(v).map((k) => ({ id: k, ...(v[k] || {}) }));
        arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setMessages(arr);
      });
    }

    findAndListen();

    return () => {
      unsubChat && unsubChat();
      activeUnsub && activeUnsub();
    };
  }, [chatId, rdb]);

  const sendMessage = async (e) => {
    e && e.preventDefault();
    const txt = (text || "").trim();
    if (!txt) return;
    // always write to messages/{chatId} path
    const messagesRefPath = `messages/${chatId}`;
    const newMsgRef = push(ref(rdb, messagesRefPath));
    const msgPayload = {
      senderId: user.id,
      senderUsername: user.username,
      text: txt,
      createdAt: Date.now()
    };
    await set(newMsgRef, msgPayload);

    // update chat lastMessage and lastMessageAt
    await set(ref(rdb, `chats/${chatId}/lastMessage`), txt).catch(()=>{});
    await set(ref(rdb, `chats/${chatId}/lastMessageAt`), Date.now()).catch(()=>{});

    setText("");
  };

  if (!user) return null;

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

      <div ref={scrollRef} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, height: "60vh", overflowY: "auto", marginBottom: 12, background: "#f9fbfd" }}>
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
                  {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
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
