require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Bienvenue sur Catcord API !');
});

// Socket.io test
io.on('connection', (socket) => {
  console.log('Nouvel utilisateur connecté :', socket.id);
  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté :', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur Catcord lancé sur le port ${PORT}`);
}); 