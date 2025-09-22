// src/components/ChatView.js
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { rtdb } from "../firebase";
import { ref, onValue, push, set, get } from "firebase/database";

/**
 * ChatView - subscribes to messages for a chat and allows sending messages.
 * - tolerant to different possible message path locations
 * - uses the single rtdb export from src/firebase.js (initialized once)
 * - avoids unhandled promise rejections by catching errors
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

  const [messages, setMessages] = useState([]);
  const [chat, setChat] = useState(null);
  const [text, setText] = useState("");
  const [messagesPath, setMessagesPath] = useState(null);
  const [error, setError] = useState(null);

  const listRef = useRef(null);

  useEffect(() => {
    if (!chatId || !user) return;

    let unsub = null;
    let mounted = true;

    async function findMessagesPathAndSubscribe() {
      try {
        // ensure chat exists
        const chatSnap = await get(ref(rtdb, `chats/${chatId}`));
        if (!chatSnap || !chatSnap.exists()) {
          if (mounted) {
            setChat(null);
            navigate("/");
          }
          return;
        }
        if (mounted) setChat({ id: chatId, ...chatSnap.val() });

        // find a path that currently has messages (or pick default)
        let foundPath = null;
        for (const pFn of POSSIBLE_MESSAGE_PATHS) {
          const candidate = pFn(chatId);
          const snap = await get(ref(rtdb, candidate));
          if (snap && snap.exists()) {
            foundPath = candidate;
            break;
          }
        }
        if (!foundPath) {
          // default fallback
          foundPath = `messages/${chatId}`;
        }

        if (!mounted) return;
        setMessagesPath(foundPath);

        // attach listener
        unsub = onValue(ref(rtdb, foundPath), (snapshot) => {
          try {
            const val = snapshot.val() || {};
            // messages might be keyed by push keys or by numeric index
            const arr = Object.entries(val).map(([id, v]) => {
              // keep id for rendering; preserve existing fields
              if (v && typeof v === "object") return { id, ...v };
              return { id, message: String(v), timestamp: Date.now() };
            });
            arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            setMessages(arr);

            // scroll to bottom after render
            setTimeout(() => {
              if (listRef.current) {
                listRef.current.scrollTop = listRef.current.scrollHeight;
              }
            }, 50);
          } catch (innerErr) {
            console.error("ChatView onValue handler error:", innerErr);
          }
        }, (listenErr) => {
          console.error("ChatView onValue failed to attach:", listenErr);
          setError("Failed to subscribe to messages.");
        });
      } catch (err) {
        console.error("ChatView setup error:", err);
        setError("Unable to load chat.");
      }
    }

    findMessagesPathAndSubscribe();

    return () => {
      mounted = false;
      if (typeof unsub === "function") {
        try { unsub(); } catch (e) { /* ignore */ }
      }
    };
  }, [chatId, user, navigate]);

  async function sendMessage(e) {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);

    if (!text || !text.trim() || !chatId || !user) return;
    const txt = text.trim();
    setText("");

    try {
      const pathToUse = messagesPath || `messages/${chatId}`;
      const newRef = push(ref(rtdb, pathToUse));
      await set(newRef, {
        senderId: user.id,
        senderUsername: user.username || null,
        message: txt,
        timestamp: Date.now(),
      });

      // best-effort: update chat metadata (not fatal)
      try {
        await set(ref(rtdb, `chats/${chatId}/lastMessage`), txt);
        await set(ref(rtdb, `chats/${chatId}/lastMessageAt`), Date.now());
      } catch (metaErr) {
        // ignore metadata update errors
        console.warn("Failed to update chat metadata:", metaErr);
      }
    } catch (err) {
      console.error("sendMessage error:", err);
      setError("Failed to send message.");
    }
  }

  if (!user) return null;
  if (!chat) return <div style={{ padding: 12 }}>Select a chat</div>;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <strong>{chat.name || `Chat ${chat.id}`}</strong>
      </div>

      {error && <div style={{ color: "salmon", marginBottom: 8 }}>{error}</div>}

      <div
        ref={listRef}
        style={{
          maxHeight: 400,
          overflow: "auto",
          border: "1px solid #eee",
          padding: 8,
          marginBottom: 8,
          background: "#fafafa",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No messages yet — say hi 👋</div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    maxWidth: "70%",
                    background: mine ? "#dcf8c6" : "#fff",
                    padding: 8,
                    borderRadius: 6,
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 4 }}>{m.message}</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>
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
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          style={{ flex: 1 }}
        />
        <button className="btn" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
