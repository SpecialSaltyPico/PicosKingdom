// 1. Variable definieren (Global)
let myName = localStorage.getItem('arcadeName') || "Gast_" + Math.floor(Math.random() * 1000);

// 2. Den Namen sofort im UI anzeigen, sobald die Seite lädt
window.onload = () => {
    document.getElementById('current-username').innerText = myName;
};

// 3. Speicher-Funktion
function saveUsername() {
    const input = document.getElementById('username-input');
    if (input && input.value.trim() !== "") {
        myName = input.value.trim();
        localStorage.setItem('arcadeName', myName); 
        document.getElementById('current-username').innerText = myName;
        alert("Name gespeichert!");
    }
}

// 4. Socket initialisieren
const socket = io();

// --- 3. RESTLICHER CODE (Tabs, Tic-Tac-Toe, etc.) ---
function showTab(tabId) {
    // ... dein bisheriger Code ...
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// ==========================================
// TIC-TAC-TOE
// ==========================================
let myTeam = null;
let currentPlayer = 'X';
const cells = document.querySelectorAll('.cell');
const winCombos = [
    [0,1,2], [3,4,5], [6,7,8], // Reihen
    [0,3,6], [1,4,7], [2,5,8], // Spalten
    [0,4,8], [2,4,6]           // Diagonalen
];

function joinTeam(team) {
    myTeam = team;
    document.getElementById('team-display').innerHTML = `Du spielst als: <strong>${team}</strong>`;
    updateTurnDisplay();
}

function updateTurnDisplay() {
    document.getElementById('turn-display').innerText = `Aktuell am Zug: ${currentPlayer}`;
}

cells.forEach(cell => {
    cell.addEventListener('click', () => {
        // Nur klicken, wenn man ein Team hat, am Zug ist und das Feld leer ist
        if (!myTeam) return alert("Bitte wähle zuerst ein Team (X oder O)!");
        if (myTeam !== currentPlayer) return alert("Du bist nicht dran!");
        if (cell.innerText !== '') return;

        cell.innerText = currentPlayer;
        socket.emit('ttt-move', { index: cell.dataset.index, player: currentPlayer });
        
        checkWin(currentPlayer);
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateTurnDisplay();
    });
});

socket.on('ttt-move', (data) => {
    document.querySelector(`.cell[data-index='${data.index}']`).innerText = data.player;
    checkWin(data.player);
    currentPlayer = data.player === 'X' ? 'O' : 'X';
    updateTurnDisplay();
});

function checkWin(player) {
    let hasWon = winCombos.some(combo => {
        return combo.every(index => cells[index].innerText === player);
    });

    if (hasWon) {
        setTimeout(() => alert(`🎉 Team ${player} hat gewonnen!`), 100);
    }
}

function requestReset() {
    socket.emit('ttt-reset');
}

socket.on('ttt-reset', () => {
    cells.forEach(cell => cell.innerText = '');
    currentPlayer = 'X';
    updateTurnDisplay();
});


// ==========================================
// ROCK PAPER SCISSORS
// ==========================================
let myRpsMove = null;

function playRPS(move) {
    myRpsMove = move;
    document.getElementById('my-status').innerText = `Gewählt: ${move}`;
    document.getElementById('rps-winner-display').innerText = "VS";
    socket.emit('rps-move', move);
}

socket.on('rps-opponent-ready', () => {
    document.getElementById('opponent-status').innerText = "Hat gewählt! 🤔";
});

socket.on('rps-result', (data) => {
    // Finde heraus, was der Gegner hatte
    let opponentMove = (data.p1Id === socket.id) ? data.p2Move : data.p1Move;
    document.getElementById('opponent-status').innerText = opponentMove;

    // Finde den Gewinner
    let resultText = "";
    if (myRpsMove === opponentMove) {
        resultText = "Unentschieden! 🤝";
    } else if (
        (myRpsMove === 'Stein' && opponentMove === 'Schere') ||
        (myRpsMove === 'Papier' && opponentMove === 'Stein') ||
        (myRpsMove === 'Schere' && opponentMove === 'Papier')
    ) {
        resultText = "Du gewinnst! 🏆";
    } else {
        resultText = "Du verlierst! 💀";
    }

    document.getElementById('rps-winner-display').innerText = resultText;
    myRpsMove = null; // Reset für die nächste Runde
});


// ==========================================
// TIER LIST MAKER
// ==========================================
let itemIdCounter = 0;

function addItem() {
    const textInput = document.getElementById('new-item-text');
    const value = textInput.value.trim();
    if (value === '') return;

    const item = document.createElement('div');
    item.className = 'tier-item';
    item.id = 'item-' + itemIdCounter++;
    item.draggable = true;
    item.ondragstart = drag;

    // Überprüfen, ob es ein Bild-Link ist (endet meist auf png/jpg oder fängt mit http an)
    if (value.startsWith('http')) {
        const img = document.createElement('img');
        img.src = value;
        item.appendChild(img);
    } else {
        item.innerText = value;
    }

    document.getElementById('unranked-pool').appendChild(item);
    textInput.value = '';
}

function allowDrop(ev) { ev.preventDefault(); }
function drag(ev) { ev.dataTransfer.setData("text", ev.target.id); }

function drop(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const draggedElement = document.getElementById(data);
    
    if (ev.target.classList.contains('tier-zone')) {
        ev.target.appendChild(draggedElement);
    } else if (ev.target.closest('.tier-zone')) {
        ev.target.closest('.tier-zone').appendChild(draggedElement);
    }
}
// Funktion zum Löschen von Elementen
function deleteItem(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const draggedElement = document.getElementById(data);
    
    // Animation: Kurz schrumpfen lassen, dann löschen
    draggedElement.style.transform = "scale(0)";
    setTimeout(() => {
        draggedElement.remove();
    }, 200);
}
// --- Click Test Logic ---
let clicks = 0;
let timerActive = false;

function startClickTest() {
    if (timerActive) {
        clicks++;
        document.getElementById('my-clicks').innerText = clicks;
        socket.emit('click-sync', clicks);
        return;
    }
    
    // Startet das Spiel
    clicks = 1;
    timerActive = true;
    let timeLeft = 10;
    document.getElementById('my-clicks').innerText = clicks;
    
    const interval = setInterval(() => {
        timeLeft--;
        document.getElementById('click-timer').innerText = `Zeit: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(interval);
            timerActive = false;
            alert(`Zeit um! Deine Klicks: ${clicks}`);
            socket.emit('click-sync', 0); // Reset für nächste Runde
        }
    }, 1000);
}

socket.on('opponent-click', (data) => {
    // Wir zeigen jetzt den Namen des Gegners an, falls mitgeschickt
    document.getElementById('opp-clicks').innerText = `${data.name}: ${data.score}`;
});

// In der startClickTest Funktion beim emit:
socket.emit('click-sync', { score: clicks, name: myName });

// --- Guess Number Logic ---
function sendGuess() {
    const input = document.getElementById('guess-input');
    const val = input.value;
    if (val) {
        // WICHTIG: Wir schicken ein Objekt mit 'guess' und 'name'
        socket.emit('guess-number', { guess: val, name: myName });
        input.value = ""; // Feld leeren
    }
}

socket.on('guess-result', (data) => {
    const log = document.getElementById('guess-log');
    // data.name ist der Name, data.guess ist die Zahl, data.result ist der Text
    log.innerHTML = `<p><strong>${data.name}</strong> riet ${data.guess}: <strong>${data.result}</strong></p>` + log.innerHTML;
});

// --- Coin Flip Logic ---
socket.on('coin-result', (side) => {
    const coin = document.getElementById('coin-visual');
    const outcome = document.getElementById('coin-outcome');
    
    // Animation starten
    coin.classList.add('flipping');
    outcome.innerText = "Die Münze fliegt...";
    
    setTimeout(() => {
        coin.classList.remove('flipping');
        outcome.innerText = "Ergebnis: " + side;
        // Ändert das Emoji je nach Ergebnis
        coin.innerText = (side === 'Kopf') ? '👤' : '🔢';
    }, 600); // Nach 0,6 Sekunden stoppt die Animation
});
// --- CHAT LOGIK ---
function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    
    if (msg !== "") {
        // Wir schicken den Text UND unseren Namen an den Server
        socket.emit('send-chat', { name: myName, msg: msg });
        input.value = ""; // Eingabefeld leeren
    }
}

// Wenn wir eine Nachricht vom Server empfangen
socket.on('receive-chat', (data) => {
    const chatWin = document.getElementById('chat-window');
    const msgElement = document.createElement('p');
    
    // Nachricht formatieren: Name fettgedruckt
    msgElement.innerHTML = `<strong>${data.name}:</strong> ${data.msg}`;
    chatWin.appendChild(msgElement);
    
    // Automatisch nach unten scrollen bei neuen Nachrichten
    chatWin.scrollTop = chatWin.scrollHeight;
});

// Bonus: Senden mit der "Enter"-Taste
document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat();
});
