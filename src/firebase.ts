import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDlCwJQswoxgwQdRXBXTNawuDNM2zbXEdk",
  authDomain: "restaurant-hacienda.firebaseapp.com",
  projectId: "restaurant-hacienda",
  storageBucket: "restaurant-hacienda.firebasestorage.app",
  messagingSenderId: "343530480570",
  appId: "1:343530480570:web:395da1eae7b0fb381e7383",
  measurementId: "G-38DD1TDJ7K"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
