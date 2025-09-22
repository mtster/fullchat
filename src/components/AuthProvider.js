// src/components/AuthProvider.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { db, serverTimestamp } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  doc,
  getDoc
} from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, username }
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // load from localStorage if present
    try {
      const s = localStorage.getItem("frbs_user");
      if (s) {
        setUser(JSON.parse(s));
      }
    } catch (err) {
      console.warn("AuthProvider: failed to parse local storage user", err);
    } finally {
      setInitializing(false);
    }
  }, []);

  // register: create a user document in Firestore in `users` collection
  // returns created user object or throws Error
  const register = async ({ username, password }) => {
    username = (username || "").trim();
    password = (password || "").trim();
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }

    // Check username availability
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error("User already exists.");
    }

    // Create user doc
    const payload = {
      username,
      password, // NOTE: original project stores plaintext. Keep same behavior.
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(usersRef, payload);

    const created = { id: docRef.id, username };

    // persist locally (session)
    localStorage.setItem("frbs_user", JSON.stringify(created));
    setUser(created);
    return created;
  };

  // login: match username + password against Firestore users
  const login = async ({ username, password }) => {
    username = (username || "").trim();
    password = (password || "").trim();
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      throw new Error("User not found.");
    }

    // find a doc with matching password
    let found = null;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.password === password) {
        found = { id: docSnap.id, username: data.username };
      }
    });

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
