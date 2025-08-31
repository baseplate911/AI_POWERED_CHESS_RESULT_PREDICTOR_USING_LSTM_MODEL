// --- DOM Elements ---
const lichessIdInput = document.getElementById('lichess-id');
const fetchBtn = document.getElementById('fetchBtn');
const errorContainer = document.getElementById('error-container');
const boardContainer = document.getElementById('board-container');
const movesContainer = document.getElementById('moves-container');
const movesList = document.getElementById('moves-list');

// State Containers
const initialState = document.getElementById('initial-state');
const loadingState = document.getElementById('loading-state');
const resultState = document.getElementById('result-state');

// Result Elements
const outcomeText = document.getElementById('outcome-text');
const confidenceBar = document.getElementById('confidence-bar');
const confidenceText = document.getElementById('confidence-text');
const whiteProbEl = document.getElementById('white-prob');
const blackProbEl = document.getElementById('black-prob');
const drawProbEl = document.getElementById('draw-prob');

let board = null;

// --- Chessboard Logic ---
const boardConfig = {
    position: 'start',
    pieceTheme: 'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png'
};
board = Chessboard('board', boardConfig);

// --- Event Listeners ---
fetchBtn.addEventListener('click', handleFetchAndPredict);
lichessIdInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        handleFetchAndPredict();
    }
});
window.addEventListener('resize', () => board && board.resize());

// --- Helper Functions ---
function displayError(message) {
    errorContainer.textContent = message;
}

function clearError() {
    errorContainer.textContent = '';
}

// --- Main API and State Management Function ---
async function handleFetchAndPredict() {
    const username = lichessIdInput.value.trim();
    if (!username) {
        displayError("Please enter a Lichess User ID.");
        return;
    }
    clearError();

    // 1. Reset UI to loading state
    initialState.classList.add('hidden');
    resultState.classList.add('hidden');
    boardContainer.classList.add('hidden');
    movesContainer.classList.add('hidden');
    loadingState.classList.remove('hidden');
    loadingState.classList.add('flex');
    fetchBtn.disabled = true;
    fetchBtn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        // This URL must point to your running backend server
        const backendApiUrl = 'http://127.0.0.1:8000/predict';
        
        const response = await fetch(backendApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'An unknown error occurred.');
        }

        const { fen, prediction, moves_so_far } = data;

        if (!fen || !prediction) {
            throw new Error('Invalid response from prediction server.');
        }

        // 2. SUCCESS: Update UI with data and show results
        loadingState.classList.add('hidden');
        loadingState.classList.remove('flex');

        board.position(fen);
        updateResultUI(prediction, moves_so_far);

        // Make the results visible
        boardContainer.classList.remove('hidden');
        resultState.classList.remove('hidden');

    } catch (error) {
        console.error("Failed to fetch or predict:", error);
        displayError(error.message);
        
        // 3. ERROR: Hide loading spinner and show the initial message again
        loadingState.classList.add('hidden');
        loadingState.classList.remove('flex');
        initialState.classList.remove('hidden');

    } finally {
        // 4. ALWAYS: Re-enable the button
        fetchBtn.disabled = false;
        fetchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function updateResultUI(predictionData, movesSoFar) {
    const { predicted_result: outcome, class_probabilities: probabilities } = predictionData;
    
    // Determine confidence and colors
    const confidencePercentString = probabilities[outcome] || "0%";
    const confidence = parseFloat(confidencePercentString.replace('%', ''));
    
    const colorMap = {
        'White wins': 'bg-green-500',
        'Black wins': 'bg-red-500',
        'Draw': 'bg-gray-500'
    };
    const bgColorMap = {
        'White wins': 'bg-green-900',
        'Black wins': 'bg-red-900',
        'Draw': 'bg-gray-900'
    };
    const color = colorMap[outcome] || 'bg-yellow-500';
    const bgColor = bgColorMap[outcome] || 'bg-yellow-900';

    // Update prediction text and confidence bar
    outcomeText.textContent = outcome;
    confidenceText.textContent = `Confidence: ${confidence.toFixed(1)}%`;
    confidenceBar.style.width = `${confidence}%`;
    confidenceBar.className = `h-4 rounded-full transition-all duration-500 ${color}`;
    
    // Update background color of the result container
    resultState.className = `flex flex-col items-center p-6 rounded-lg w-full max-w-md mx-auto ${bgColor} bg-opacity-50`;
    
    // Update individual probabilities
    whiteProbEl.textContent = probabilities['White wins'] || '0%';
    blackProbEl.textContent = probabilities['Black wins'] || '0%';
    drawProbEl.textContent = probabilities['Draw'] || '0%';

    // Update moves list
    movesList.innerHTML = ''; // Clear previous moves
    if (movesSoFar && movesSoFar.length > 0) {
        movesSoFar.forEach((move, index) => {
            if (index % 2 === 0) { // Before a White move, add the move number
                const moveNumber = Math.floor(index / 2) + 1;
                const moveNumEl = document.createElement('span');
                moveNumEl.className = 'text-gray-400 w-6 text-right pr-1';
                moveNumEl.textContent = `${moveNumber}.`;
                movesList.appendChild(moveNumEl);
            }
            const moveEl = document.createElement('span');
            moveEl.className = 'text-white';
            moveEl.textContent = move;
            movesList.appendChild(moveEl);
        });
        movesContainer.classList.remove('hidden');
    } else {
        movesContainer.classList.add('hidden');
    }
}