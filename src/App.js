// src/App.js
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AuthProvider, { useAuth } from "./components/AuthProvider";
import Login from "./components/Login";
import Register from "./components/Register";
import ChatList from "./components/ChatList";
import ChatView from "./components/ChatView";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <ChatList />
          </PrivateRoute>
        }
      />

      <Route
        path="/chats/:chatId"
        element={
          <PrivateRoute>
            <ChatView />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<div style={{ padding: 30 }}>404 - Not Found</div>} />
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
