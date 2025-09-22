// src/components/ChatView.js
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { rtdb } from "../firebase";
import { ref, onValue, push, set, get } from "firebase/database";

/**
 * ChatView - robust chat UI:
 * - finds the messages path for the chat (tolerant)
 * - subscribes to messages at that path
 * - stores discovered messagesPath in state so sendMessage writes to same path
 * - updates chat metadata (lastMessage, lastMessageAt)
 */

const POSSIBLE_MESSAGE_PATHS = [
  (chatId) => `messages/${chatId}`,
  (chatId) => `chatMessages/${chatId}`,
  (chatId) => `chats/${chatId}/messages`,
  (chatId) => `messagesByChat/${chatId}`,
  (chatId) => `chats/${chatId}/messagesById`,
];

export default function ChatView() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [messagesPath, setMessagesPath] = useState(null);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!chatId || !user) return;
    let detached = false;
    let unsubMessages = null;
    let unsubChat = null;

    async function setup() {
      try {
        // chat metadata subscription
        const chatRef = ref(rtdb, `chats/${chatId}`);
        unsubChat = onValue(chatRef, (snap) => {
          if (!snap || !snap.exists()) {
            setChat(null);
            // redirect if chat disappears
            navigate("/", { replace: true });
            return;
          }
          setChat({ id: chatId, ...(snap.val() || {}) });
        });

        // attempt to find a messages path
        let foundPath = null;
        for (const fn of POSSIBLE_MESSAGE_PATHS) {
          const candidate = fn(chatId);
          const snap = await get(ref(rtdb, candidate));
          if (snap && snap.exists()) {
            foundPath = candidate;
            break;
          }
        }
        if (!foundPath) {
          // fallback default
          foundPath = `messages/${chatId}`;
        }
        if (detached) return;
        setMessagesPath(foundPath);

        // subscribe to messages
        unsubMessages = onValue(ref(rtdb, foundPath), (snap) => {
          try {
            const val = snap.val() || {};
            const arr = Object.entries(val).map(([id, v]) => {
              if (v && typeof v === "object") return { id, ...v };
              return { id, message: String(v), timestamp: Date.now() };
            });
            arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            setMessages(arr);
            // scroll down a little after new messages
            setTimeout(() => {
              if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
            }, 60);
          } catch (err) {
            console.error("ChatView: messages onValue handler error", err);
          }
        }, (listenErr) => {
          console.error("ChatView: failed to attach message listener", listenErr);
          setError("Failed to subscribe to messages");
        });

      } catch (err) {
        console.error("ChatView setup error", err);
        setError("Unable to load chat messages");
      }
    }

    setup();

    return () => {
      detached = true;
      try { if (typeof unsubMessages === "function") unsubMessages(); } catch(_) {}
      try { if (typeof unsubChat === "function") unsubChat(); } catch(_) {}
    };
  }, [chatId, user, navigate]);

  async function sendMessage(e) {
    e && e.preventDefault();
    setError(null);
    if (!text || !text.trim() || !chatId || !user) return;
    const toSend = text.trim();
    setText("");
    try {
      const path = messagesPath || `messages/${chatId}`;
      const newRef = push(ref(rtdb, path));
      await set(newRef, {
        senderId: user.id,
        senderUsername: user.username || null,
        message: toSend,
        timestamp: Date.now(),
      });

      // best-effort update chat metadata
      try {
        await set(ref(rtdb, `chats/${chatId}/lastMessage`), toSend);
        await set(ref(rtdb, `chats/${chatId}/lastMessageAt`), Date.now());
      } catch (metaErr) {
        // silently ignore metadata failures
        console.warn("ChatView: failed to update chat metadata", metaErr);
      }
    } catch (err) {
      console.error("ChatView: sendMessage error", err);
      setError("Failed to send message");
    }
  }

  if (!user) return null;
  if (!chat) return <div style={{ padding: 12 }}>Select a chat</div>;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn" onClick={() => navigate(-1)}>Back</button>
        <div style={{ fontWeight: 600 }}>{chat.name || `Chat ${chat.id}`}</div>
        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          {chat && chat.participantUsernames ? chat.participantUsernames.join(", ") : ""}
        </div>
      </div>

      {error && <div style={{ color: "salmon", marginBottom: 8 }}>{error}</div>}

      <div ref={listRef} style={{ maxHeight: 420, overflow: "auto", border: "1px solid #eee", padding: 8, marginBottom: 8, background: "#fafafa" }}>
        {messages.length === 0 ? (
          <div style={{ opacity: 0.7, textAlign: "center", padding: 16 }}>No messages yet — say hi 👋</div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 6 }}>
                <div style={{ maxWidth: "70%", background: mine ? "#dcf8c6" : "#fff", padding: 8, borderRadius: 6, boxShadow: "0 0 0 1px rgba(0,0,0,0.03)" }}>
                  <div style={{ marginBottom: 6 }}>{m.message}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    {m.senderUsername ? `${m.senderUsername} • ` : ""}
                    {m.timestamp ? new Date(m.timestamp).toLocaleString() : ""}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" style={{ flex: 1 }} />
        <button className="btn" type="submit">Send</button>
      </form>
    </div>
  );
}
