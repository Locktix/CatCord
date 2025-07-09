import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, getDocs, query, collection, where } from "firebase/firestore";
import { db } from "../firebase";

export default function AuthForm({ user, onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Génère un discriminator unique à 4 chiffres pour ce pseudo
        let discriminator;
        let unique = false;
        const pseudo = email.split("@")[0];
        while (!unique) {
          discriminator = ("000" + Math.floor(Math.random() * 10000)).slice(-4);
          const q = query(collection(db, "users"), where("pseudo", "==", pseudo), where("discriminator", "==", discriminator));
          const snap = await getDocs(q);
          if (snap.empty) unique = true;
        }
        await setDoc(doc(db, "users", cred.user.uid), {
          email,
          pseudo,
          discriminator,
          friends: [],
          avatar: "",
          status: "online"
        });
      }
      onAuth && onAuth();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    onAuth && onAuth();
  };

  if (user) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-lg">Connecté en tant que <span className="font-bold">{user.email}</span></div>
        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-white">Déconnexion</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs mx-auto bg-black bg-opacity-40 p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-2 text-center">{isLogin ? "Connexion" : "Inscription"}</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
        required
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
        required
        autoComplete="current-password"
      />
      {error && <div className="text-red-400 text-sm text-center">{error}</div>}
      <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white font-semibold">
        {isLogin ? "Se connecter" : "S'inscrire"}
      </button>
      <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-indigo-300 hover:underline text-sm">
        {isLogin ? "Pas de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
      </button>
    </form>
  );
} 