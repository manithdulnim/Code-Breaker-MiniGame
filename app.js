import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, push, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Your Firebase configuration
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
let playerRole = null; // 'creator' or 'joiner'

// --- Select UI Elements ---
const btnCreate = document.getElementById('btn-create');
const btnJoin = document.getElementById('btn-join');
const btnSubmit = document.getElementById('btn-submit-guess');
const setupSection = document.getElementById('setup-section');
const playArea = document.getElementById('play-area');
const turnIndicator = document.getElementById('turn-indicator');
const guessLog = document.getElementById('guess-log');

// --- Event Listeners ---

btnCreate.addEventListener('click', async () => {
    console.log("Attempting to create game...");
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
        console.log("Game created! ID:", gameId);
    } catch (e) {
        console.error("Create Error:", e);
        alert("Firebase Connection Failed. Check Database Rules!");
    }
});

btnJoin.addEventListener('click', async () => {
    const inputId = document.getElementById('join-id-input').value.toUpperCase();
    if (!inputId) return alert("Please enter a Game ID");

    gameId = inputId;
    try {
        await update(ref(db, 'games/' + gameId), { status: 'active' });
        playerRole = 'joiner';
        startUI(gameId);
        console.log("Joined game:", gameId);
    } catch (e) {
        console.error("Join Error:", e);
        alert("Game ID not found or Database Error.");
    }
});

btnSubmit.addEventListener('click', async () => {
    const guessInput = document.getElementById('player-guess');
    const guess = guessInput.value;
    if (guess.length !== 4) return alert("Enter exactly 4 digits");

    const snapshot = await get(ref(db, 'games/' + gameId));
    const data = snapshot.val();

    if (data.turn !== playerRole) return alert("Wait for your turn!");

    const result = calculateBullsAndCows(guess, data.secretCode);
    const nextTurn = playerRole === 'creator' ? 'joiner' : 'creator';
    const isWin = result === "4 Bulls, 0 Cows";

    // Push guess to log
    await push(ref(db, 'games/' + gameId + '/guesses'), { val: guess, result: result });
    
    // Update game state
    await update(ref(db, 'games/' + gameId), { 
        turn: nextTurn,
        status: isWin ? 'won' : 'active'
    });

    guessInput.value = '';
});

// --- Helper Functions ---

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

        // Turn Logic
        turnIndicator.innerText = data.turn === playerRole ? "🟢 YOUR TURN!" : "⏳ Opponent's Turn...";
        
        // Update Logs
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
            turnIndicator.innerText = "🎉 GAME OVER - CODE BROKEN!";
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
