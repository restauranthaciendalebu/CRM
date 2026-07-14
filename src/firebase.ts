import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDlCwJQswoxgwQdRXBXTNawuDNM2zbXEdk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "restaurant-hacienda.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "restaurant-hacienda",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "restaurant-hacienda.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "343530480570",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:343530480570:web:395da1eae7b0fb381e7383",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-38DD1TDJ7K"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
