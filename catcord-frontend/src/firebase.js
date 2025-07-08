// Import des fonctions Firebase nécessaires
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCweZNhn747ybn82etgWfKS7ZDIVUzC9ww",
  authDomain: "catcord-b8ec8.firebaseapp.com",
  projectId: "catcord-b8ec8",
  storageBucket: "catcord-b8ec8.appspot.com",
  messagingSenderId: "505779431139",
  appId: "1:505779431139:web:3f50525b8dd0cead4607d6",
  measurementId: "G-FRL5SD62ZL"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app; 