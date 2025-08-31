// --- DOM Elements ---
const lichessIdInput = document.getElementById('lichess-id');
const fetchBtn = document.getElementById('fetchBtn');
const errorContainer = document.getElementById('error-container');

// Board and Moves
const boardContainer = document.getElementById('board-container');
const board = Chessboard('board', { 
    position: 'start',
    pieceTheme: 'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png'
});
const movesContainer = document.getElementById('moves-container');
const movesList = document.getElementById('moves-list');

// Result States
const resultContainer = document.getElementById('result-container');
const initialState = document.getElementById('initial-state');
const loadingState = document.getElementById('loading-state');
const resultState = document.getElementById('result-state');

// Final Prediction Elements
const outcomeText = document.getElementById('outcome-text');
const confidenceBar = document.getElementById('confidence-bar');
const confidenceText = document.getElementById('confidence-text');
const whiteProbEl = document.getElementById('white-prob');
const blackProbEl = document.getElementById('black-prob');
const drawProbEl = document.getElementById('draw-prob');

// New Move-by-Move Analysis Elements
const movePredictionsContainer = document.getElementById('move-predictions-container');
const movePredictionsList = document.getElementById('move-predictions-list');

// --- Event Listeners ---
fetchBtn.addEventListener('click', handleFetchAndPredict);
lichessIdInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') handleFetchAndPredict();
});
$(window).resize(board.resize);

// --- Main Handler Function ---
async function handleFetchAndPredict() {
    const username = lichessIdInput.value.trim();
    if (!username) {
        errorContainer.textContent = "Please enter a Lichess User ID.";
        return;
    }
    errorContainer.textContent = '';

    // Set UI to loading state
    initialState.classList.add('hidden');
    resultState.classList.add('hidden');
    boardContainer.classList.add('hidden');
    movesContainer.classList.add('hidden');
    movePredictionsContainer.classList.add('hidden');
    loadingState.classList.remove('hidden');
    fetchBtn.disabled = true;
    fetchBtn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        // *** IMPORTANT: This URL must point to your LIVE backend on Render ***
        const backendApiUrl = 'https://ai-powered-chess-result-prediction.onrender.com/'; 

        const response = await fetch(backendApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || 'An unknown error occurred.');
        }

        // Hide loading spinner and update the UI with the full history
        loadingState.classList.add('hidden');
        updateUIWithHistory(data);

    } catch (error) {
        console.error("Failed to fetch or predict:", error);
        errorContainer.textContent = error.message;
        // Reset UI on error
        loadingState.classList.add('hidden');
        initialState.classList.remove('hidden');
    } finally {
        // Re-enable the button
        fetchBtn.disabled = false;
        fetchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function updateUIWithHistory(data) {
    const { final_fen, all_moves, history } = data;

    if (!history || history.length === 0) {
        errorContainer.textContent = "No moves found in the game to analyze.";
        initialState.classList.remove('hidden');
        return;
    }

    // --- 1. Update Board and Moves List ---
    board.position(final_fen);
    boardContainer.classList.remove('hidden');
    
    movesList.innerHTML = '';
    all_moves.forEach((move, index) => {
        if (index % 2 === 0) {
            const moveNumber = Math.floor(index / 2) + 1;
            const moveEl = document.createElement('span');
            moveEl.className = 'text-gray-400 w-6 text-right pr-1';
            moveEl.textContent = `${moveNumber}.`;
            movesList.appendChild(moveEl);
        }
        const moveEl = document.createElement('span');
        moveEl.className = 'text-white';
        moveEl.textContent = move;
        movesList.appendChild(moveEl);
    });
    movesContainer.classList.remove('hidden');

    // --- 2. Update Final Prediction Box ---
    const finalPrediction = history[history.length - 1];
    const outcome = finalPrediction.prediction;
    const finalProbs = finalPrediction.probabilities;
    
    outcomeText.textContent = outcome;
    whiteProbEl.textContent = finalProbs.white;
    blackProbEl.textContent = finalProbs.black;
    drawProbEl.textContent = finalProbs.draw;

    const colorMap = { 'White wins': 'bg-green-500', 'Black wins': 'bg-red-500', 'Draw': 'bg-gray-500' };
    const textMap = { 'White wins': 'text-green-300', 'Black wins': 'text-red-300', 'Draw': 'text-gray-300' };
    
    outcomeText.className = `text-4xl font-bold ${textMap[outcome] || 'text-white'}`;
    
    // Determine the correct probability key based on the outcome
    let confidenceKey = 'draw';
    if (outcome === 'White wins') confidenceKey = 'white';
    if (outcome === 'Black wins') confidenceKey = 'black';
    
    const confidenceValue = parseFloat(finalProbs[confidenceKey] || '0%');
    confidenceBar.style.width = `${confidenceValue}%`;
    confidenceBar.className = `h-4 rounded-full transition-all duration-500 ${colorMap[outcome] || 'bg-yellow-500'}`;
    confidenceText.textContent = `Confidence: ${confidenceValue.toFixed(1)}%`;

    resultState.classList.remove('hidden');

    // --- 3. Populate Move-by-Move Analysis List ---
    movePredictionsList.innerHTML = '';
    history.forEach(item => {
        const moveDiv = document.createElement('div');
        moveDiv.className = 'p-3 bg-gray-700/50 rounded-lg';

        const moveInfo = document.createElement('p');
        moveInfo.className = 'font-semibold text-white';
        moveInfo.textContent = `${item.move_number}. (${item.player}) ${item.move}`;
        
        const predictionInfo = document.createElement('p');
        predictionInfo.className = 'text-gray-300 text-xs mt-1';
        predictionInfo.textContent = `Prediction: ${item.prediction} (W: ${item.probabilities.white}, B: ${item.probabilities.black}, D: ${item.probabilities.draw})`;

        moveDiv.appendChild(moveInfo);
        moveDiv.appendChild(predictionInfo);
        movePredictionsList.appendChild(moveDiv);
    });
    movePredictionsContainer.classList.remove('hidden');
}