#cell1
import chess.pgn
import numpy as np
from collections import defaultdict #provide default dictionary


#cell2
from tqdm import tqdm


def parse_pgn(file_path, max_games=None):
    games = []
    results = []
    count = 0

    with open(file_path, 'r', encoding='utf-8') as pgn:
        pbar = tqdm(total=max_games, desc='Parsing games', unit='game')
        while True:
            game = chess.pgn.read_game(pgn)
            if game is None or (max_games and count >= max_games):
                break
            board = game.board()
            moves = []
            for move in game.mainline_moves():
                moves.append(board.san(move))
                board.push(move)
            result = game.headers.get('Result', None)
            if result == '1-0':
                label = 0
            elif result == '0-1':
                label = 1
            elif result == '1/2-1/2':
                label = 2
            else:
                continue
            games.append(moves)
            results.append(label)
            count += 1
            pbar.update(1)
        pbar.close()

    return games, results


#cell3
pgn_file='/content/drive/MyDrive/project_2_dataset/lichess_db_standard_rated_2013-01.pgn'
max_games_to_load=121332 #original game are 121332

games,results=parse_pgn(pgn_file,max_games=max_games_to_load)

print(f'Total games parsed: {len(games)}')
print(f'Example moves from the first game: {games[0]}')
print(f'Example label from the first game: {results[0]}')

#cell4
all_moves=[move for game in games for move in game]
move_freq= defaultdict(int)  # unique move to a unique integer

for move in all_moves:
  move_freq[move]+=1 # each unique move freq

move_to_idx=  {move:idx+1 for idx, move in enumerate(move_freq.keys())}
idx__to_move= {idx:move for move, idx in move_to_idx.items()}

print(f'Total unique moves in dataset: {len(move_to_idx)}')

#cell5
def encode_games(games, move_to_idx, max_len=100):
  encoded_games= []
  for game in games:
    encoded_seq=[move_to_idx.get(move,0) for move in game]

    if len(encoded_seq)<max_len:
      encoded_seq+=[0]*(max_len-len(encoded_seq))
    else:
      encoded_seq=encoded_seq[:max_len] #remove longer seq

    encoded_games.append(encoded_seq)
  return np.array(encoded_games)

max_sequence_length=100

X=encode_games(games, move_to_idx, max_len=max_sequence_length)
y=np.array(results)

print(f'Encoded data shape: {X.shape}')
print(f'Lable data shape: {y.shape}')

#cell6
#splitting

from sklearn.model_selection import train_test_split

X_train_val, X_test, y_train_val, y_test=train_test_split(X,y,test_size=0.15,random_state=42,stratify=y) #testing

X_train, X_val ,y_train ,y_val=train_test_split(X_train_val,y_train_val,test_size=0.15,random_state=42,stratify=y_train_val)

print(f'Train set size: {X_train.shape[0]}')
print(f'Validation set size: {X_val.shape[0]}')
print(f'Test set size : {X_test.shape[0]}')

#cell7
num_samples,timesteps=X_train.shape
X_train_2d=X_train.reshape((num_samples,timesteps))

smote=SMOTE(random_state=42)

X_train_resampled, y_train_resampled=smote.fit_resample(X_train_2d,y_train)

X_train_resampled=X_train_resampled.reshape((-1,timesteps))

print(f'X_train shape before SMOTE: {X_train.shape}')
print(f'X_train shape after SMOTE: {X_train_resampled.shape}')


#cell8
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, LSTM, Dense ,Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.utils.class_weight import compute_class_weight
from imblearn.over_sampling import SMOTE


def build_lstm_model(vocab_size, embedding_dim=64, lstm_units=128, max_len=100,num_classes=3):
  model=Sequential()

  model.add(Embedding(input_dim=vocab_size+1,
                      output_dim=embedding_dim,
                      mask_zero=True))

  model.add(LSTM(lstm_units))

  model.add(Dropout(0.3)) #to avoid overfitting

  model.add(Dense(num_classes, activation='softmax'))

  model.compile(optimizer=Adam(learning_rate=0.001),
                loss='sparse_categorical_crossentropy',
                metrics=['accuracy'])
  return model

#parameters from pipeline
vocab_size=len(move_to_idx)   #no of unique moves
embedding_dim=64
lstm_units=128  #size of lstm hidden state
max_len=100
num_classes=3

#build model instance
model=build_lstm_model(vocab_size,embedding_dim,lstm_units,max_len,num_classes)

#Earlystopping
early_stopping=EarlyStopping(monitor='val_loss',patience=3,restore_best_weights=True,verbose=1)
#train model on training data, validating each epochs on validation data

history=model.fit(X_train_resampled, y_train_resampled,
                       epochs=10,
                       batch_size=64, # each batch=1370 training data
                       validation_data=(X_val, y_val),
                       callbacks=[early_stopping],
                  )

#eval
test_loss, test_acc =model.evaluate(X_test,y_test,verbose=2)
print(f'Test accuracy: {test_acc:.4f}')



#cell9
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import confusion_matrix, classification_report
import seaborn as sns

# Predict classes on test set
y_pred_prob = model.predict(X_test)
y_pred = np.argmax(y_pred_prob, axis=1)

# Confusion matrix
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('Confusion Matrix')
plt.xlabel('Predicted Label')
plt.ylabel('True Label')
plt.show()

# Classification report: precision, recall, f1-score per class
print("Classification Report:")
print(classification_report(y_test, y_pred))

# Plot training history for accuracy and loss
plt.figure(figsize=(14, 5))

plt.subplot(1, 2, 1)
plt.plot(history.history['accuracy'], label='Train Accuracy')
plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
plt.title('Accuracy Over Epochs')
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(history.history['loss'], label='Train Loss')
plt.plot(history.history['val_loss'], label='Validation Loss')
plt.title('Loss Over Epochs')
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.legend()

plt.show()
