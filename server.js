const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let rpsChoices = {}; // Speichert die Züge für RPS

io.on('connection', (socket) => {
    console.log('Ein Spieler ist beigetreten:', socket.id);

    // --- Tic-Tac-Toe ---
    socket.on('ttt-move', (data) => {
        socket.broadcast.emit('ttt-move', data);
    });
    socket.on('ttt-reset', () => {
        io.emit('ttt-reset'); // Sagt ALLEN, dass sie resetten sollen
    });

    // --- Rock Paper Scissors ---
    socket.on('rps-move', (move) => {
        rpsChoices[socket.id] = move;
        socket.broadcast.emit('rps-opponent-ready'); // Sagt dem anderen: "Ich bin bereit!"

        const players = Object.keys(rpsChoices);
        
        // Wenn 2 Spieler ihren Zug gemacht haben, auflösen!
        if (players.length >= 2) {
            const p1 = players[0];
            const p2 = players[1];
            
            io.emit('rps-result', {
                p1Id: p1, p1Move: rpsChoices[p1],
                p2Id: p2, p2Move: rpsChoices[p2]
            });
            
            rpsChoices = {}; // Züge zurücksetzen für die nächste Runde
        }
    });

    socket.on('disconnect', () => {
        console.log('Ein Spieler hat das Spiel verlassen');
        delete rpsChoices[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server läuft! Öffne http://localhost:${PORT}`);
});