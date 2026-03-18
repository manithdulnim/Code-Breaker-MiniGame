import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getDatabase, ref, set, onValue, update, push, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Your updated Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBYORqa8ncIZD8CuMniqqZM0EM9nEehTdA",
    authDomain: "code-breaker-game.firebaseapp.com",
    projectId: "code-breaker-game",
    storageBucket: "code-breaker-game.firebasestorage.app",
    messagingSenderId: "329226601075",
    appId: "1:329226601075:web:75d1d809daf157800c6006",
    measurementId: "G-YKJF2Z9BFM",
    // Added based on your regional database location (Singapore)
    databaseURL: "https://code-breaker-game-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

let gameId = null;
let playerRole = null; 

// --- UI Elements ---
const btnCreate = document.getElementById('btn-create');
const btnJoin = document.getElementById('btn-join');
const btnSubmit = document.getElementById('btn-submit-guess');
const setupSection = document.getElementById('setup-section');
const playArea = document.getElementById('play-area');
const turnIndicator = document.getElementById('turn-indicator');
const guessLog = document.getElementById('guess-log');

// --- Event Listeners ---

btnCreate.addEventListener('click', async () => {
    console.log("Creating game...");
    gameId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const secretCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    try {
        await set(ref(db, 'games/' + gameId), {
            secretCode: secretCode,
            turn: 'joiner', 
            status: 'waiting',
            guesses: []
        });
        playerRole = 'creator';
        startUI(gameId);
    } catch (e) {
        console.error("Firebase Error:", e);
        alert("Check your Firebase Rules! Set them to read/write: true.");
    }
});

btnJoin.addEventListener('click', async () => {
    const inputId = document.getElementById('join-id-input').value.toUpperCase();
    if (!inputId) return alert("Enter a Game ID");

    gameId = inputId;
    try {
        await update(ref(db, 'games/' + gameId), { status: 'active' });
        playerRole = 'joiner';
        startUI(gameId);
    } catch (e) {
        console.error("Join Error:", e);
        alert("Game not found.");
    }
});

btnSubmit.addEventListener('click', async () => {
    const guessInput = document.getElementById('player-guess');
    const guess = guessInput.value;
    if (guess.length !== 4) return alert("Enter 4 digits");

    const snapshot = await get(ref(db, 'games/' + gameId));
    const data = snapshot.val();

    if (data.turn !== playerRole) return alert("Wait for your turn!");

    const result = calculateBullsAndCows(guess, data.secretCode);
    const nextTurn = playerRole === 'creator' ? 'joiner' : 'creator';
    const isWin = result === "4 Bulls, 0 Cows";

    await push(ref(db, 'games/' + gameId + '/guesses'), { val: guess, result: result });
    
    await update(ref(db, 'games/' + gameId), { 
        turn: nextTurn,
        status: isWin ? 'won' : 'active'
    });

    guessInput.value = '';
});

// --- Game Functions ---

function startUI(id) {
    document.getElementById('display-id').innerText = id;
    setupSection.classList.add('hidden');
    playArea.classList.remove('hidden');
    listenForChanges();
}

function listenForChanges() {
    onValue(ref(db, 'games/' + gameId), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        turnIndicator.innerText = data.turn === playerRole ? "🟢 YOUR TURN" : "⏳ OPPONENT'S TURN";
        
        guessLog.innerHTML = '';
        if (data.guesses) {
            Object.values(data.guesses).reverse().forEach(g => {
                const div = document.createElement('div');
                div.className = 'guess-entry';
                div.innerHTML = `<strong>${g.val}</strong>: ${g.result}`;
                guessLog.appendChild(div);
            });
        }

        if (data.status === 'won') {
            turnIndicator.innerText = "🎉 CODE BROKEN!";
            btnSubmit.disabled = true;
        }
    });
}

function calculateBullsAndCows(guess, secret) {
    let bulls = 0, cows = 0;
    const gArr = guess.split('');
    const sArr = secret.split('');

    gArr.forEach((char, i) => {
        if (char === sArr[i]) bulls++;
        else if (sArr.includes(char)) cows++;
    });
    return `${bulls} Bulls, ${cows} Cows`;
}
