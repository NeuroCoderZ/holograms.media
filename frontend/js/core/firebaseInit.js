// frontend/js/core/firebaseInit.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
// Uncomment and add if Firebase Functions (callable) will be used from client:
// import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-functions.js";

// Firebase configuration (MUST MATCH the one in index.html and be accurate)
const firebaseConfig = {
  apiKey: "AIzaSyDkLcTXe5q2U0TYewWWXY-fZfx31u1rq4Q", // VERIFY from Firebase Console
  authDomain: "holograms-media.firebaseapp.com",
  projectId: "holograms-media",
  storageBucket: "holograms-media.firebasestorage.app", // VERIFY
  messagingSenderId: "808002961976",
  appId: "1:808002961976:web:aa0cd8acb2f7d8bfa85ccd",  // VERIFY
  measurementId: "G-PJP22ESWCM" // <--- ВОТ ЭТА СТРОКА ДОЛЖНА БЫТЬ
};

// Initialize Firebase
// Check if app was already initialized via a temporary global in index.html
// This is a transitional step. Ideally, all initialization should solely reside here.
const app = window._firebaseAppInstance || initializeApp(firebaseConfig);
if (!window._firebaseAppInstance) {
    console.log("Firebase App initialized in firebaseInit.js (Task 2/3 Complete)");
} else {
    console.log("Firebase App REUSED from index.html initialization in firebaseInit.js (Task 2/3 Complete)");
}
// Clean up the temporary global variable
if (window._firebaseAppInstance) {
    delete window._firebaseAppInstance;
}

// Initialize necessary Firebase services
const auth = getAuth(app);
const storage = getStorage(app);
const firestore = getFirestore(app); // For potential use with user settings or other non-PostgreSQL data
// const functions = getFunctions(app); // For calling Cloud Functions from client

console.log("Firebase services (auth, storage, firestore) initialized in firebaseInit.js.");

// Export instances for use in other modules
export { app, auth, storage, firestore, GoogleAuthProvider }; 
// Add 'functions' to export if uncommented above
