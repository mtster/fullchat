// src/components/Login.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function Login() {
  const { login } = useAuth();
  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [err,setErr] = useState(null);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      await login({ username: username.trim(), password });
      navigate("/chats");
    } catch (error) {
      setErr(error.message);
    }
  };

  return (
    <div className="auth-card">
      <h2>Login</h2>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <div className="meta" style={{marginTop:6}}>
            Your password must not match any password used for your other accounts, as it will be visible to the app administrator.
          </div>
        </div>
        {err && <div style={{color:"salmon", marginBottom:8}}>{err}</div>}
        <div style={{display:"flex", gap:8}}>
          <button className="btn" type="submit">Log in</button>
          <Link to="/register"><button type="button" className="btn secondary">Register</button></Link>
        </div>
      </form>
    </div>
  );
}
