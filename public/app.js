const socket = io();

function showTab(tabId) {
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