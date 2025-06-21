
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA0aJJ5_iuLX6ewiOIZPnC1oIgulaT8n6Q",
  authDomain: "edrole-73.firebaseapp.com",
  databaseURL: "https://edrole-73-default-rtdb.firebaseio.com",
  projectId: "edrole-73",
  storageBucket: "edrole-73.appspot.com",
  messagingSenderId: "43762900050",
  appId: "1:43762900050:web:7cefd4812ee20f5c94138b",
  measurementId: "G-L0EKXGKLYS"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

let analytics;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, analytics, GoogleAuthProvider };
