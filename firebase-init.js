// firebase-init.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

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
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { app, auth, db, storage, analytics, onAuthStateChanged };