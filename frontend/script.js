// --- DOM Elements ---
const lichessIdInput = document.getElementById('lichess-id');
const fetchBtn = document.getElementById('fetchBtn');
const errorContainer = document.getElementById('error-container');

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

// Moves Section
const movesContainer = document.getElementById('moves-container');
const movesList = document.getElementById('moves-list');

// --- Event Listeners ---
fetchBtn.addEventListener('click', handleFetchAndPredict);
lichessIdInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') handleFetchAndPredict();
});

// --- Main Handler Function ---
async function handleFetchAndPredict() {
    const username = lichessIdInput.value.trim();
    if (!username) {
        errorContainer.textContent = "Please enter a Lichess User ID.";
        return;
    }
    errorContainer.textContent = '';

    // Set UI to loading state
    showState('loading');
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

        // Update the UI with the final prediction
        updateUI(data);

    } catch (error) {
        console.error("Failed to fetch or predict:", error);
        errorContainer.textContent = error.message;
        // Reset UI on error
        showState('initial');
    } finally {
        // Re-enable the button
        fetchBtn.disabled = false;
        fetchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function updateUI(data) {
    const { prediction, moves_so_far } = data;

    // --- Update Final Prediction Box ---
    const outcome = prediction.predicted_result;
    const finalProbs = prediction.class_probabilities;
    
    outcomeText.textContent = outcome;
    whiteProbEl.textContent = finalProbs['White wins'];
    blackProbEl.textContent = finalProbs['Black wins'];
    drawProbEl.textContent = finalProbs['Draw'];

    const colorMap = { 'White wins': 'bg-green-500', 'Black wins': 'bg-red-500', 'Draw': 'bg-gray-500' };
    const textMap = { 'White wins': 'text-green-300', 'Black wins': 'text-red-300', 'Draw': 'text-gray-300' };
    
    outcomeText.className = `text-4xl font-bold ${textMap[outcome] || 'text-white'}`;
    
    let confidenceKey = 'Draw';
    if (outcome === 'White wins') confidenceKey = 'White wins';
    if (outcome === 'Black wins') confidenceKey = 'Black wins';
    
    const confidenceValue = parseFloat(finalProbs[confidenceKey] || '0%');
    confidenceBar.style.width = `${confidenceValue}%`;
    confidenceBar.className = `h-4 rounded-full transition-all duration-500 ${colorMap[outcome] || 'bg-yellow-500'}`;
    confidenceText.textContent = `Confidence: ${confidenceValue.toFixed(1)}%`;

    showState('results');

    // --- Update Moves List ---
    if (moves_so_far && moves_so_far.length > 0) {
        movesContainer.classList.remove('hidden');
        movesList.innerHTML = ""; // Clear old moves

        moves_so_far.forEach((move, index) => {
            const moveNumber = Math.floor(index / 2) + 1;
            if (index % 2 === 0) {
                // White's move
                const row = document.createElement("div");
                row.className = "flex justify-between border-b border-gray-600 py-1";
                row.innerHTML = `<span class="text-gray-400">${moveNumber}.</span> 
                                 <span class="font-semibold">${move}</span> 
                                 <span id="black-move-${moveNumber}"></span>`;
                movesList.appendChild(row);
            } else {
                // Black's move → append to same row
                const row = movesList.lastChild;
                const blackMoveCell = row.querySelector(`#black-move-${moveNumber}`);
                if (blackMoveCell) blackMoveCell.textContent = move;
            }
        });
    } else {
        movesContainer.classList.add('hidden');
    }
}

// Initial state setup
showState('initial');

function showState(state) {
    initialState.classList.add('hidden');
    loadingState.classList.add('hidden');
    resultState.classList.add('hidden');
    movesContainer.classList.add('hidden');

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
            movesContainer.classList.remove('hidden');
            break;
    }
}
