// src/components/AuthProvider.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { db, serverTimestamp } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  updateDoc,
  arrayUnion
} from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() { return useContext(AuthContext); }

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("frbs_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem("frbs_user");
      }
    }
    setInitializing(false);
  }, []);

  const register = async ({ username, password }) => {
    // enforce unique username
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error("Username already exists");
    }
    // create user doc with plain-text password per request warning
    const newUserRef = doc(usersRef); // auto id
    const userObj = {
      id: newUserRef.id,
      username,
      password,
      chatIds: [],
      createdAt: serverTimestamp()
    };
    await setDoc(newUserRef, userObj);
    // set local session
    setUser({ id: newUserRef.id, username });
    localStorage.setItem("frbs_user", JSON.stringify({ id: newUserRef.id, username }));
    return { id: newUserRef.id, username };
  };

  const login = async ({ username, password }) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("User not found");
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    if (data.password !== password) {
      throw new Error("Incorrect password");
    }
    setUser({ id: docSnap.id, username: data.username });
    localStorage.setItem("frbs_user", JSON.stringify({ id: docSnap.id, username: data.username }));
    return { id: docSnap.id, username: data.username };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("frbs_user");
    // also clear lastChat
    localStorage.removeItem("lastChat");
  };

  const value = { user, register, login, logout, initializing };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
