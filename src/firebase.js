// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA-FwUy8WLXiYtT46F0f59gr461cEI_zmo",
  authDomain: "protocol-chat-b6120.firebaseapp.com",
  databaseURL: "https://protocol-chat-b6120-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "protocol-chat-b6120",
  storageBucket: "protocol-chat-b6120.appspot.com",
  messagingSenderId: "969101904718",
  appId: "1:969101904718:web:8dcd0bc8690649235cec1f"
};

// Make sure app isn’t initialized more than once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Both databases
export const db = getDatabase(app);         // Realtime Database
export const firestore = getFirestore(app); // Firestore (if you still need it)

// Auth (for login/register if you extend later)
export const auth = getAuth(app);

// Utility
export { serverTimestamp };

export default app;
