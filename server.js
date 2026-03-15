const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// --- SPIEL-DATEN ---
let targetNumber = Math.floor(Math.random() * 100) + 1;
let rpsChoices = {};

io.on('connection', (socket) => {
    console.log('Ein Spieler ist verbunden:', socket.id);

    // --- Tic-Tac-Toe ---
    socket.on('ttt-move', (data) => {
        socket.broadcast.emit('ttt-move', data);
    });
    socket.on('ttt-reset', () => {
        io.emit('ttt-reset');
    });

    // --- Rock Paper Scissors ---
    socket.on('rps-move', (move) => {
        rpsChoices[socket.id] = move;
        socket.broadcast.emit('rps-opponent-ready');
        const players = Object.keys(rpsChoices);
        if (players.length >= 2) {
            const p1 = players[0];
            const p2 = players[1];
            io.emit('rps-result', {
                p1Id: p1, p1Move: rpsChoices[p1],
                p2Id: p2, p2Move: rpsChoices[p2]
            });
            rpsChoices = {};
        }
    });

    // --- Click Speed Test ---
    socket.on('click-sync', (data) => {
        socket.broadcast.emit('opponent-click', data); 
    });

    // --- Zahlenraten (GEFIXTE LOGIK) ---
    socket.on('guess-number', (data) => {
        let guess = parseInt(data.guess);
        let name = data.name || "Gast";
        let result = "";

        if (isNaN(guess)) {
            result = "keine Zahl! ❌";
        } else if (guess < targetNumber) {
            result = "Zu niedrig! ↓";
        } else if (guess > targetNumber) {
            result = "Zu hoch! ↑";
        } else {
            result = "RICHTIG! 🎉";
            targetNumber = Math.floor(Math.random() * 100) + 1; // Neue Zahl
        }

        io.emit('guess-result', { guess, result, name });
    });

    // --- Coin Flip ---
    socket.on('flip-coin', () => {
        const side = Math.random() > 0.5 ? 'Kopf' : 'Zahl';
        io.emit('coin-result', side);
    });

    // --- Chat System (NEU) ---
    socket.on('send-chat', (data) => {
        io.emit('receive-chat', { name: data.name, msg: data.msg });
    });

    socket.on('disconnect', () => {
        delete rpsChoices[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
});
