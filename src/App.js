import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Import your page components
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";

function App() {
  return (
    <Routes>
      {/* Default route redirects to chats if logged in, or login if not */}
      <Route path="/" element={<Navigate to="/chats" />} />

      {/* Auth pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Main pages */}
      <Route path="/chats" element={<HomePage />} />
      <Route path="/chats/:chatId" element={<ChatPage />} />
    </Routes>
  );
}

export default App;
