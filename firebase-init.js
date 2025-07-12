// Firebase/app must be imported first
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA74TnN9IoyQjCncKOIOShWEktrL1hd96o",
  authDomain: "kpop-pett.firebaseapp.com",
  projectId: "kpop-pett",
  storageBucket: "kpop-pett.appspot.com",
  messagingSenderId: "264650615774",
  appId: "1:264650615774:web:f500ff555183110c3f0b4f",
  measurementId: "G-3BH0GMJR3D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export necessary Firebase services and functions
export { auth, db, signInAnonymously, signOut, onAuthStateChanged, doc, setDoc, getDoc };
