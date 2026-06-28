import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA55cY5H2DpG1WGxcv21pVbKXtajD_FwDE",
  authDomain: "chiou-family-tracker.firebaseapp.com",
  databaseURL: "https://chiou-family-tracker-default-rtdb.firebaseio.com",
  projectId: "chiou-family-tracker",
  storageBucket: "chiou-family-tracker.firebasestorage.app",
  messagingSenderId: "925549523880",
  appId: "1:925549523880:web:5794685d972b5a7553a39d"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
