import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"; // <-- NEW

const firebaseConfig = {
  apiKey: "AIzaSyB-V7BCMWt6o75_uN85PqlSXrEBaa2ldM4",
  authDomain: "medicine-shop-c06b9.firebaseapp.com",
  projectId: "medicine-shop-c06b9",
  storageBucket: "medicine-shop-c06b9.firebasestorage.app",
  messagingSenderId: "697637066510",
  appId: "1:697637066510:web:cd873ce40057c4ee04295f",
  measurementId: "G-CVVYERYCQC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // <-- NEW