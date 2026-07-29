import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCXMC30NgbN2iW452XNikLuahV2aV0wEM4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "restaurant-hacienda-santiago.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "restaurant-hacienda-santiago",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "restaurant-hacienda-santiago.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "944648373618",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:944648373618:web:36dc0f3a6f9579e58a09eb"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
