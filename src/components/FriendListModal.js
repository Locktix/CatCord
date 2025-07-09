import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDoc, deleteDoc, getDocs } from "firebase/firestore";

export default function FriendListModal({ onClose }) {
  const user = auth.currentUser;
  const [friends, setFriends] = useState([]);
  const [requestsReceived, setRequestsReceived] = useState([]);
  const [requestsSent, setRequestsSent] = useState([]);
  const [addValue, setAddValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [openDM, setOpenDM] = useState(null);

  // Récupère la liste d'amis
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
      const data = snap.data();
      setFriends(data?.friends || []);
    });
    return () => unsub();
  }, [user]);

  // Récupère les demandes reçues
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "friendRequests"), where("to", "==", user.uid), where("status", "==", "pending"));
    const unsub = onSnapshot(q, snap => {
      setRequestsReceived(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  // Récupère les demandes envoyées
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "friendRequests"), where("from", "==", user.uid), where("status", "==", "pending"));
    const unsub = onSnapshot(q, snap => {
      setRequestsSent(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  // Suggestions d'amis
  useEffect(() => {
    let active = true;
    if (!addValue.trim() || addValue.length < 2) {
      setSuggestions([]);
      return;
    }
    (async () => {
      const val = addValue.trim();
      let q;
      if (val.includes('#')) {
        const [pseudo, discriminator] = val.split('#');
        q = query(collection(db, "users"), where("pseudo", ">=", pseudo), where("pseudo", "<=", pseudo + '\uf8ff'), where("discriminator", ">=", discriminator || "0000"), where("discriminator", "<=", (discriminator || "9999") + '\uf8ff'));
      } else {
        q = query(collection(db, "users"), where("pseudo", ">=", val), where("pseudo", "<=", val + '\uf8ff'));
      }
      const snap = await getDocs(q);
      if (!active) return;
      setSuggestions(snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user.uid && !(friends || []).includes(u.id))
        .slice(0, 5));
    })();
    return () => { active = false; };
  }, [addValue, user, friends]);

  // Ajout d'ami
  const handleAddFriend = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!addValue.trim()) return;
    // Recherche par pseudo OU email
    const q = query(collection(db, "users"), where("pseudo", "==", addValue.trim()));
    const snap = await getDocs(q);
    let toUid = null;
    if (!snap.empty) {
      toUid = snap.docs[0].id;
    } else {
      // Essaye par email
      const q2 = query(collection(db, "users"), where("email", "==", addValue.trim()));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) toUid = snap2.docs[0].id;
    }
    if (!toUid) {
      setError("Utilisateur introuvable");
      return;
    }
    if (toUid === user.uid) {
      setError("Impossible de s'ajouter soi-même");
      return;
    }
    // Vérifie si déjà ami ou déjà une demande
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (userSnap.exists() && (userSnap.data().friends || []).includes(toUid)) {
      setError("Déjà ami");
      return;
    }
    // Ajoute la demande
    await addDoc(collection(db, "friendRequests"), {
      from: user.uid,
      to: toUid,
      status: "pending",
      createdAt: new Date(),
    });
    setSuccess("Demande envoyée !");
    setAddValue("");
  };

  // Accepter/refuser une demande
  const handleAccept = async (req) => {
    await updateDoc(doc(db, "friendRequests", req.id), { status: "accepted" });
    // Ajoute chacun dans la liste d'amis de l'autre
    const userRef = doc(db, "users", user.uid);
    const otherRef = doc(db, "users", req.from);
    const userSnap = await getDoc(userRef);
    const otherSnap = await getDoc(otherRef);
    await updateDoc(userRef, { friends: [...(userSnap.data().friends || []), req.from] });
    await updateDoc(otherRef, { friends: [...(otherSnap.data().friends || []), user.uid] });
  };
  const handleReject = async (req) => {
    await updateDoc(doc(db, "friendRequests", req.id), { status: "rejected" });
  };
  const handleRemoveFriend = async (uid) => {
    // Retire l'ami des deux côtés
    const userRef = doc(db, "users", user.uid);
    const otherRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    const otherSnap = await getDoc(otherRef);
    await updateDoc(userRef, { friends: (userSnap.data().friends || []).filter(f => f !== uid) });
    await updateDoc(otherRef, { friends: (otherSnap.data().friends || []).filter(f => f !== user.uid) });
  };

  // Gestion ouverture DM
  if (openDM) {
    // On simule l'ouverture d'un DM en stockant l'ID, à intégrer avec l'UI principale si besoin
    window.openDMWithUser?.(openDM); // Hook global à connecter dans App.js si besoin
    setOpenDM(null);
    setSelectedFriend(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 rounded-2xl p-10 shadow-2xl relative max-w-lg w-full min-h-[500px]">
        <button className="absolute top-4 right-8 text-indigo-400 hover:underline text-xs" onClick={onClose}>Fermer</button>
        <h2 className="text-2xl font-bold mb-6">Amis</h2>
        <form onSubmit={handleAddFriend} className="flex gap-2 mb-6 relative">
          <input
            type="text"
            placeholder="Pseudo ou pseudo#ID"
            value={addValue}
            onChange={e => setAddValue(e.target.value)}
            className="flex-1 px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
            autoComplete="off"
          />
          <button type="submit" className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white font-semibold">Ajouter</button>
          {suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded shadow-lg z-10">
              {suggestions.map(u => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-indigo-700 text-white flex items-center gap-2"
                  onClick={() => setAddValue(u.pseudo + '#' + (u.discriminator || '0000'))}
                >
                  <img src={u.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${u.id}`} alt="avatar" className="w-6 h-6 rounded-full object-cover mr-2" />
                  <span className="font-semibold">{u.pseudo}</span>
                  <span className="text-xs text-purple-300">#{u.discriminator || '0000'}</span>
                </button>
              ))}
            </div>
          )}
        </form>
        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
        {success && <div className="text-green-400 text-sm mb-2">{success}</div>}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2">Mes amis</h3>
          {friends.length === 0 ? (
            <div className="text-purple-300">Aucun ami.</div>
          ) : (
            <ul className="space-y-2">
              {friends.map(uid => (
                <FriendItem key={uid} uid={uid} onClick={() => setSelectedFriend(uid)} />
              ))}
            </ul>
          )}
        </div>
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2">Demandes reçues</h3>
          {requestsReceived.length === 0 ? (
            <div className="text-purple-300">Aucune demande.</div>
          ) : (
            <ul className="space-y-2">
              {requestsReceived.map(req => (
                <li key={req.id} className="flex items-center gap-2 bg-gray-800 rounded px-3 py-2">
                  <FriendItem uid={req.from} />
                  <button onClick={() => handleAccept(req)} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">Accepter</button>
                  <button onClick={() => handleReject(req)} className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">Refuser</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold mb-2">Demandes envoyées</h3>
          {requestsSent.length === 0 ? (
            <div className="text-purple-300">Aucune demande.</div>
          ) : (
            <ul className="space-y-2">
              {requestsSent.map(req => (
                <li key={req.id} className="flex items-center gap-2 bg-gray-800 rounded px-3 py-2">
                  <FriendItem uid={req.to} />
                  <span className="text-xs text-purple-300">En attente</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedFriend && (
          <FriendProfileModal
            uid={selectedFriend}
            onClose={() => setSelectedFriend(null)}
            onRemove={handleRemoveFriend}
            onDM={uid => setOpenDM(uid)}
          />
        )}
      </div>
    </div>
  );
}

function FriendItem({ uid, onRemove, onClick }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    getDoc(doc(db, "users", uid)).then(snap => setProfile(snap.data()));
  }, [uid]);
  if (!profile) return <span>Chargement...</span>;
  return (
    <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 rounded px-2 py-1" onClick={onClick}>
      <img src={profile.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`} alt="avatar" className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500" />
      <span className="font-semibold text-sm text-white">{profile.pseudo || profile.email || uid}</span>
      {profile.discriminator && <span className="text-xs text-purple-300 ml-1">#{profile.discriminator}</span>}
      {onRemove && (
        <button onClick={e => { e.stopPropagation(); onRemove(uid); }} className="text-xs text-red-400 hover:underline ml-2">Supprimer</button>
      )}
    </div>
  );
}

function FriendProfileModal({ uid, onClose, onRemove, onDM }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    getDoc(doc(db, "users", uid)).then(snap => setProfile(snap.data()));
  }, [uid]);
  if (!profile) return null;
  const createdAt = profile.createdAt ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : "?";
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl relative max-w-xs w-full flex flex-col items-center">
        <button className="absolute top-4 right-4 text-indigo-400 hover:underline text-xs" onClick={onClose}>Fermer</button>
        <img src={profile.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 mb-4" />
        <div className="text-xl font-bold text-white mb-1">{profile.pseudo} <span className="text-purple-300">#{profile.discriminator}</span></div>
        <div className="text-sm text-purple-200 mb-2">Inscrit le : {createdAt}</div>
        {profile.status && <div className="text-xs text-green-400 mb-1">Statut : {profile.status}</div>}
        <div className="flex gap-2 mt-2">
          <button onClick={() => { onRemove(uid); onClose(); }} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-white font-semibold">Supprimer ami</button>
          <button onClick={() => onDM(uid)} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white font-semibold">DM</button>
        </div>
      </div>
    </div>
  );
} 