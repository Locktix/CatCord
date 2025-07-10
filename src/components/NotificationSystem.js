import React, { useEffect, useState, useRef } from 'react';
import { auth } from '../firebase';

// Sons de notification
const notificationSounds = {
  message: '/sounds/message.mp3',
  dm: '/sounds/dm.mp3',
  mention: '/sounds/mention.mp3'
};

// Gestionnaire de notifications
class NotificationManager {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.notifications = [];
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      // Initialiser l'audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Charger les sons
      await this.loadSounds();
      
      // Demander la permission pour les notifications
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
    }
  }

  async loadSounds() {
    try {
      // Créer des sons synthétiques si les fichiers n'existent pas
      this.sounds.message = this.createTone(800, 0.1, 'sine');
      this.sounds.dm = this.createTone(1000, 0.15, 'square');
      this.sounds.mention = this.createTone(1200, 0.2, 'triangle');
    } catch (error) {
      console.error('Erreur chargement sons:', error);
    }
  }

  createTone(frequency, duration, type = 'sine') {
    return () => {
      if (!this.audioContext) return;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    };
  }

  async playSound(type = 'message') {
    console.log('Tentative de lecture son:', type, 'Initialized:', this.isInitialized);
    if (!this.isInitialized || !this.sounds[type]) {
      console.log('Son non disponible:', type);
      return;
    }
    
    try {
      // Reprendre l'audio context si suspendu
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      console.log('Lecture du son:', type);
      this.sounds[type]();
    } catch (error) {
      console.error('Erreur lecture son:', error);
    }
  }

  showNotification(title, options = {}) {
    if (!this.isInitialized) return;
    
    try {
      // Notification Windows
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          icon: '/logo192.png',
          badge: '/logo192.png',
          requireInteraction: false,
          silent: false,
          ...options
        });
        
        // Auto-fermeture après 5 secondes
        setTimeout(() => {
          notification.close();
        }, 5000);
        
        // Gestion du clic
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    } catch (error) {
      console.error('Erreur notification Windows:', error);
    }
  }

  async notify(type, data) {
    const { title, body, icon, soundType = 'message' } = data;
    
    console.log('Notification reçue:', type, data);
    
    // Jouer le son
    await this.playSound(soundType);
    
    // Afficher la notification Windows
    this.showNotification(title, { body, icon });
    
    // Retourner les données pour les bulles
    return { type, ...data };
  }
}

// Instance globale
const notificationManager = new NotificationManager();

// Hook pour les notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [windowsNotifications, setWindowsNotifications] = useState(true);

  const addNotification = async (type, data) => {
    console.log('addNotification appelé:', type, data, 'Enabled:', isEnabled);
    if (!isEnabled) {
      console.log('Notifications désactivées');
      return;
    }
    
    try {
      const notification = await notificationManager.notify(type, data);
      
      // Ajouter la bulle de notification
      const id = Date.now();
      const bubble = {
        id,
        type,
        ...notification,
        timestamp: new Date()
      };
      
      console.log('Ajout de la bulle:', bubble);
      setNotifications(prev => [...prev, bubble]);
      
      // Auto-suppression après 5 secondes
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de notification:', error);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleNotifications = () => {
    setIsEnabled(!isEnabled);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (soundEnabled) {
      notificationManager.playSound('message');
    }
  };

  const toggleWindowsNotifications = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setWindowsNotifications(permission === 'granted');
      } else {
        setWindowsNotifications(!windowsNotifications);
      }
    }
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    isEnabled,
    soundEnabled,
    windowsNotifications,
    toggleNotifications,
    toggleSound,
    toggleWindowsNotifications
  };
}

// Composant de bulles de notification
export function NotificationBubbles({ notifications, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`
            bg-gray-900 border-l-4 rounded-lg shadow-lg p-4 max-w-sm transform transition-all duration-300
            ${notification.type === 'dm' ? 'border-purple-500' : 
              notification.type === 'mention' ? 'border-red-500' : 'border-indigo-500'}
            animate-slideIn
          `}
          onClick={() => onRemove(notification.id)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {notification.type === 'dm' ? '💬' : 
               notification.type === 'mention' ? '🔔' : '📢'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white mb-1">
                {notification.title}
              </h4>
              <p className="text-xs text-purple-200 mb-2">
                {notification.body}
              </p>
              <div className="text-xs text-gray-400">
                {notification.timestamp.toLocaleTimeString()}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(notification.id);
              }}
              className="text-gray-400 hover:text-white text-lg"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Composant de paramètres de notifications
export function NotificationSettings({ 
  isEnabled, 
  soundEnabled, 
  windowsNotifications,
  onToggleNotifications,
  onToggleSound,
  onToggleWindowsNotifications 
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white mb-4">Paramètres de notifications</h3>
      
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-white">Notifications</div>
          <div className="text-sm text-purple-200">Activer les notifications</div>
        </div>
        <button
          onClick={onToggleNotifications}
          className={`w-12 h-6 rounded-full transition-colors ${
            isEnabled ? 'bg-indigo-600' : 'bg-gray-600'
          }`}
        >
          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
            isEnabled ? 'transform translate-x-6' : 'transform translate-x-1'
          }`} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-white">Sons</div>
          <div className="text-sm text-purple-200">Sons de notification</div>
        </div>
        <button
          onClick={onToggleSound}
          className={`w-12 h-6 rounded-full transition-colors ${
            soundEnabled ? 'bg-indigo-600' : 'bg-gray-600'
          }`}
        >
          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
            soundEnabled ? 'transform translate-x-6' : 'transform translate-x-1'
          }`} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-white">Notifications Windows</div>
          <div className="text-sm text-purple-200">Notifications système</div>
        </div>
        <button
          onClick={onToggleWindowsNotifications}
          className={`w-12 h-6 rounded-full transition-colors ${
            windowsNotifications ? 'bg-indigo-600' : 'bg-gray-600'
          }`}
        >
          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
            windowsNotifications ? 'transform translate-x-6' : 'transform translate-x-1'
          }`} />
        </button>
      </div>
    </div>
  );
}

export default notificationManager; 