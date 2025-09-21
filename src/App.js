// src/App.js
import React from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import AuthProvider, { useAuth } from "./components/AuthProvider";
import Login from "./components/Login";
import Register from "./components/Register";
import ChatList from "./components/ChatList";
import ChatView from "./components/ChatView";
import Header from "./components/Header";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Resume last chat if user returns
    if (user) {
      const lastChat = localStorage.getItem("lastChat");
      if (lastChat) {
        navigate(`/chats/${lastChat}`, { replace: true });
      } else {
        navigate("/chats", { replace: true });
      }
    }
  }, [user, navigate]);

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/chats" /> : <Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/chats" element={
        <PrivateRoute>
          <div className="app">
            <ChatList />
            <div className="right">
              <Header />
              {/* default info area */}
              <div style={{ padding: 20, color: "var(--muted)" }}>
                Select a chat from the left or create a new chat.
              </div>
            </div>
          </div>
        </PrivateRoute>
      } />

      <Route path="/chats/:chatId" element={
        <PrivateRoute>
          <div className="app">
            <ChatList />
            <div className="right">
              <Header />
              <ChatView />
            </div>
          </div>
        </PrivateRoute>
      } />
      <Route path="*" element={<div style={{padding:30}}>404 - Not Found</div>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
