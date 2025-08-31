import httpx
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tensorflow.keras.models import load_model
import pickle
import chess

app = FastAPI()

# Add CORS middleware to allow the frontend to communicate with this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# --- Model and Scaler Loading ---
# Paths are relative to this main.py file
try:
    model = load_model('model_resources/final_lstm_model.keras')
    with open('model_resources/move_to_idx.pkl', 'rb') as f:
        move_to_idx = pickle.load(f)
    with open('model_resources/scaler.pkl', 'rb') as f:
        scaler = pickle.load(f)
except FileNotFoundError as e:
    print(f"Error loading model or pickle files: {e}")
    print("Please ensure you have a 'model_resources' folder with the required files.")
    exit()

# --- Configuration ---
max_len = 100
label_map = {0: 'White wins', 1: 'Black wins', 2: 'Draw'}

class UserName(BaseModel):
    username: str

# --- Helper Functions ---
def compute_material_advantage(board):
    """Calculates the material advantage for White."""
    piece_values = {'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9}
    white_material = sum(piece_values.get(p.symbol().upper(), 0) for p in board.piece_map().values() if p.color == chess.WHITE)
    black_material = sum(piece_values.get(p.symbol().upper(), 0) for p in board.piece_map().values() if p.color == chess.BLACK)
    return white_material - black_material

def safe_int(value, default=1500):
    """Safely converts a value to an integer, returning a default if it fails."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default

def encode_moves(moves, move_to_idx, max_len=100):
    """Encodes a list of SAN moves into a padded sequence of integers."""
    encoded_seq = [move_to_idx.get(move, 0) for move in moves]
    if len(encoded_seq) < max_len:
        encoded_seq += [0] * (max_len - len(encoded_seq))
    else:
        encoded_seq = encoded_seq[:max_len]
    return np.array(encoded_seq).reshape(1, max_len)

def process_numerical_features(white_elo, black_elo, board):
    """Processes and scales the numerical features for the model."""
    mat_adv = compute_material_advantage(board)
    features = np.array([[white_elo, black_elo, mat_adv]])
    scaled_features = scaler.transform(features)
    return scaled_features

# --- API Endpoint ---
@app.post("/predict")
async def predict_game(user: UserName):
    """Fetches a user's current game from Lichess and predicts the outcome."""
    lichess_url = f"https://lichess.org/api/user/{user.username}/current-game"
    headers = {'Accept': 'application/json'}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(lichess_url, headers=headers)
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="User not found or is not currently in a game.")
            response.raise_for_status()
            game_data = response.json()
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Error communicating with Lichess API: {exc}")

    board = chess.Board()
    
    white_elo = safe_int(game_data.get('players', {}).get('white', {}).get('rating'))
    black_elo = safe_int(game_data.get('players', {}).get('black', {}).get('rating'))
    
    moves_so_far = []
    moves_san_str = game_data.get("moves", "")
    if moves_san_str:
        moves_so_far = moves_san_str.split()
        for move_san in moves_so_far:
            try:
                board.push_san(move_san)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid move '{move_san}' in game history.")
    
    X_moves = encode_moves(moves_so_far, move_to_idx, max_len=max_len)
    X_numeric = process_numerical_features(white_elo, black_elo, board)

    preds = model.predict([X_moves, X_numeric])
    pred_class = int(preds.argmax(axis=1)[0])
    pred_probs = preds[0]

    formatted_probs = {
        label_map[i]: f"{pred_probs[i]*100:.2f}%" for i in range(len(pred_probs))
    }
    
    return {
        "fen": board.fen(),
        "prediction": {
            "predicted_result": label_map.get(pred_class, "Unknown"),
            "class_probabilities": formatted_probs
        },
        "moves_so_far": moves_so_far
    }