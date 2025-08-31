// --- DOM Elements ---
const lichessIdInput = document.getElementById('lichess-id');
const fetchBtn = document.getElementById('fetchBtn');
const errorContainer = document.getElementById('error-container');

// Removed: Board and Moves elements
// const boardContainer = document.getElementById('board-container');
// let board = null;
// const movesContainer = document.getElementById('moves-container');
// const movesList = document.getElementById('moves-list');

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

// Removed: Move-by-Move Analysis elements
// const movePredictionsContainer = document.getElementById('move-predictions-container');
// const movePredictionsList = document.getElementById('move-predictions-list');

// --- Event Listeners ---
fetchBtn.addEventListener('click', handleFetchAndPredict);
lichessIdInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') handleFetchAndPredict();
});

// Removed: Board resize listener
// $(window).resize(board.resize);

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
    
    // Removed: Board and Moves container hiding
    // boardContainer.classList.add('hidden');
    // movesContainer.classList.add('hidden');
    // movePredictionsContainer.classList.add('hidden');
    
    loadingState.classList.remove('hidden');
    loadingState.classList.add('flex');
    fetchBtn.disabled = true;
    fetchBtn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        const backendApiUrl = 'https://chess-predictor-backend.onrender.com';

        const response = await fetch(`${backendApiUrl}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || 'An unknown error occurred.');
        }

        // Hide loading spinner and update the UI with the final prediction
        loadingState.classList.add('hidden');
        updateUI(data);

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

function updateUI(data) {
    // Removed: Board and moves data from destructuring
    const { prediction } = data;

    // --- 1. Removed: Board and Moves List Update Logic ---
    // The code that updates the board and moves list is no longer needed.

    // --- 2. Update Final Prediction Box ---
    const outcome = prediction.predicted_result;
    const finalProbs = prediction.class_probabilities;
    
    outcomeText.textContent = outcome;
    whiteProbEl.textContent = finalProbs['White wins'];
    blackProbEl.textContent = finalProbs['Black wins'];
    drawProbEl.textContent = finalProbs['Draw'];

    const colorMap = { 'White wins': 'bg-green-500', 'Black wins': 'bg-red-500', 'Draw': 'bg-gray-500' };
    const textMap = { 'White wins': 'text-green-300', 'Black wins': 'text-red-300', 'Draw': 'text-gray-300' };
    
    outcomeText.className = `text-4xl font-bold ${textMap[outcome] || 'text-white'}`;
    
    // Determine the correct probability key based on the outcome
    let confidenceKey = 'Draw';
    if (outcome === 'White wins') confidenceKey = 'White wins';
    if (outcome === 'Black wins') confidenceKey = 'Black wins';
    
    const confidenceValue = parseFloat(finalProbs[confidenceKey] || '0%');
    confidenceBar.style.width = `${confidenceValue}%`;
    confidenceBar.className = `h-4 rounded-full transition-all duration-500 ${colorMap[outcome] || 'bg-yellow-500'}`;
    confidenceText.textContent = `Confidence: ${confidenceValue.toFixed(1)}%`;

    resultState.classList.remove('hidden');
}

// Initial state setup
showState('initial');

function showState(state) {
    initialState.classList.add('hidden');
    loadingState.classList.add('hidden');
    resultState.classList.add('hidden');
    
    // Removed: Board and moves container hiding
    // boardContainer.classList.add('hidden');
    // movesContainer.classList.add('hidden');
    // movePredictionsContainer.classList.add('hidden');

    switch(state) {
        case 'initial':
            initialState.classList.remove('hidden');
            break;
        case 'loading':
            loadingState.classList.remove('hidden');
            loadingState.classList.add('flex');
            break;
        case 'results':
            resultState.classList.remove('hidden');
            resultState.classList.add('flex');
            
            // Removed: Board and moves container showing
            // boardContainer.classList.remove('hidden');
            // movesContainer.classList.remove('hidden');
            break;
    }
}
