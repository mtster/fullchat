// src/components/AuthProvider.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { getApp } from "firebase/app";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";

const AuthContext = createContext();
export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, username }
  const [initializing, setInitializing] = useState(true);
  const app = getApp(); // uses already-initialized app from your src/firebase.js
  const rdb = getDatabase(app);

  useEffect(() => {
    try {
      const s = localStorage.getItem("frbs_user");
      if (s) setUser(JSON.parse(s));
    } catch (err) {
      console.warn("AuthProvider: localStorage parse failed", err);
    } finally {
      setInitializing(false);
    }
  }, []);

  const register = async ({ username, password }) => {
    username = (username || "").trim();
    password = (password || "").trim();
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }

    // Check username availability
    const usersRef = ref(rdb, "users");
    const q = query(usersRef, orderByChild("username"), equalTo(username));
    const snap = await get(q);
    if (snap.exists()) {
      throw new Error("User already exists.");
    }

    // Create user entry
    const newUserRef = push(usersRef);
    const uid = newUserRef.key;
    const payload = {
      username,
      password, // plain text to stay consistent with existing app behavior
      createdAt: Date.now(),
    };
    await set(newUserRef, payload);

    const created = { id: uid, username };

    // Persist locally and set as logged in
    localStorage.setItem("frbs_user", JSON.stringify(created));
    setUser(created);

    return created;
  };

  const login = async ({ username, password }) => {
    username = (username || "").trim();
    password = (password || "").trim();
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }

    const usersRef = ref(rdb, "users");
    const q = query(usersRef, orderByChild("username"), equalTo(username));
    const snap = await get(q);
    if (!snap.exists()) {
      throw new Error("User not found.");
    }

    // snap.val() is an object of matched users; find one with matching password
    const val = snap.val();
    let found = null;
    for (const key of Object.keys(val)) {
      const u = val[key];
      if (u.password === password) {
        found = { id: key, username: u.username };
        break;
      }
    }
    if (!found) {
      throw new Error("Invalid password.");
    }

    localStorage.setItem("frbs_user", JSON.stringify(found));
    setUser(found);
    return found;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("frbs_user");
    localStorage.removeItem("lastChat");
  };

  const value = { user, register, login, logout, initializing };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
