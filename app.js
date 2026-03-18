import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, push, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Your specific Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_g4WJdG_7BlTSJNlbvOgqD_q14zYMs7g",
  authDomain: "tuition-earning-dashboard.firebaseapp.com",
  projectId: "tuition-earning-dashboard",
  storageBucket: "tuition-earning-dashboard.firebasestorage.app",
  messagingSenderId: "670340026664",
  appId: "1:670340026664:web:e82842267de137aa71401d",
  measurementId: "G-RM0S7RVN26"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let gameId = null;
let playerRole = null;

// --- UI Elements ---
const setupSection = document.getElementById('setup-section');
const playArea = document.getElementById('play-area');
const turnIndicator = document.getElementById('turn-indicator');
const guessLog = document.getElementById('guess-log');

// --- Game Functions ---

window.createGame = function() {
    gameId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const secretCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    set(ref(db, 'games/' + gameId), {
        secretCode: secretCode,
        turn: 'joiner', 
        status: 'waiting',
        guesses: []
    });

    playerRole = 'creator';
    initGameUI(gameId);
};

window.joinGame = function() {
    gameId = document.getElementById('join-id').value.toUpperCase();
    if (!gameId) return alert("Enter an ID");

    update(ref(db, 'games/' + gameId), { status: 'active' });
    playerRole = 'joiner';
    initGameUI(gameId);
};

function initGameUI(id) {
    document.getElementById('display-id').innerText = id;
    setupSection.classList.add('hidden');
    playArea.classList.remove('hidden');
    listenToGame();
}

function listenToGame() {
    onValue(ref(db, 'games/' + gameId), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        turnIndicator.innerText = data.turn === playerRole ? "Your Turn!" : "Waiting for opponent...";

        guessLog.innerHTML = '';
        if (data.guesses) {
            Object.values(data.guesses).forEach(g => {
                const div = document.createElement('div');
                div.className = 'guess-entry';
                div.innerText = `Guess: ${g.val} | Result: ${g.result}`;
                guessLog.appendChild(div);
            });
        }

        if (data.status === 'won') alert("Code Broken! 🎉");
    });
}

window.submitGuess = function() {
    const guessInput = document.getElementById('player-guess');
    const guess = guessInput.value;
    if (guess.length !== 4) return alert("Enter 4 digits");

    get(ref(db, 'games/' + gameId)).then((snapshot) => {
        const data = snapshot.val();
        if (data.turn !== playerRole) return alert("Not your turn!");

        const result = checkGuess(guess, data.secretCode);
        const nextTurn = playerRole === 'creator' ? 'joiner' : 'creator';

        push(ref(db, 'games/' + gameId + '/guesses'), { val: guess, result: result });
        update(ref(db, 'games/' + gameId), { 
            turn: nextTurn,
            status: result === "4 Bulls, 0 Cows" ? "won" : "active"
        });
        guessInput.value = '';
    });
};

function checkGuess(guess, secret) {
    let bulls = 0, cows = 0;
    const gArr = guess.split(''), sArr = secret.split('');
    gArr.forEach((char, i) => {
        if (char === sArr[i]) bulls++;
        else if (sArr.includes(char)) cows++;
    });
    return `${bulls} Bulls, ${cows} Cows`;
}
