// src/components/AuthProvider.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { rtdb } from "../firebase";
import {
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
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("frbs_user");
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch (err) {
      console.warn("AuthProvider: localStorage parse failed", err);
    } finally {
      setInitializing(false);
    }
  }, []);

  // Register: create a user node under /users and persist local
  const register = async ({ username, password }) => {
    username = (username || "").trim();
    password = (password || "").trim();
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }

    // Check username availability
    const usersRef = ref(rtdb, "users");
    const q = query(usersRef, orderByChild("username"), equalTo(username));
    const snap = await get(q);
    if (snap && snap.exists()) {
      throw new Error("User already exists.");
    }

    // Create user entry
    const newUserRef = push(usersRef);
    const uid = newUserRef.key;
    const payload = {
      username,
      password, // plaintext here to keep parity with current app (not secure, but matches existing behaviour)
      createdAt: Date.now(),
    };
    await set(newUserRef, payload);

    const created = { id: uid, username };
    localStorage.setItem("frbs_user", JSON.stringify(created));
    setUser(created);
    return created;
  };

  // Login: find user by username then validate password
  const login = async ({ username, password }) => {
    username = (username || "").trim();
    password = (password || "").trim();
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }

    const usersRef = ref(rtdb, "users");
    const q = query(usersRef, orderByChild("username"), equalTo(username));
    const snap = await get(q);
    if (!snap || !snap.exists()) {
      throw new Error("User not found.");
    }

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
