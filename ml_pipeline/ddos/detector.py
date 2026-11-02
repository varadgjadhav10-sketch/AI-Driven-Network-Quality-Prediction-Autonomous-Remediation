import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

class DDoSDetector(nn.Module):
    """
    Ensemble CNN-BiLSTM for DDoS Detection.
    CNN extracts spatial patterns from reshaped traffic matrices.
    BiLSTM captures temporal sequential flow statistics.
    """
    def __init__(self, input_dim=10, matrix_size=4, hidden_dim=64):
        super(DDoSDetector, self).__init__()
        
        # 1. CNN Module: For spatial feature extraction
        # Input: Traffic matrices (e.g., 4x4 if input_dim=16)
        self.cnn = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Flatten()
        )
        
        # 2. BiLSTM Module: For temporal sequence analysis
        # Input: Sequence of flow features
        self.bilstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=2,
            batch_first=True,
            bidirectional=True,
            dropout=0.2
        )
        
        # 3. Fusion & Classifier
        # Combining spatial (CNN) and temporal (BiLSTM) features
        # Assuming input_dim=10, matrix_size=4 is for illustration
        cnn_out_dim = 32 * (matrix_size // 2) * (matrix_size // 2)
        bilstm_out_dim = hidden_dim * 2 # Bidirectional
        
        self.classifier = nn.Sequential(
            nn.Linear(cnn_out_dim + bilstm_out_dim, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def forward(self, x_seq, x_matrix):
        """
        x_seq: (batch, seq_len, input_dim)
        x_matrix: (batch, 1, matrix_size, matrix_size)
        """
        # CNN Branch
        cnn_features = self.cnn(x_matrix)
        
        # BiLSTM Branch
        lstm_out, _ = self.bilstm(x_seq)
        lstm_features = lstm_out[:, -1, :] # Take last hidden state
        
        # Fusion
        combined = torch.cat((cnn_features, lstm_features), dim=1)
        
        return self.classifier(combined)

def preprocess_and_smote(X, y):
    """
    Apply SMOTE to balance the training data for minority DDoS classes.
    """
    from imblearn.over_sampling import SMOTE

    sm = SMOTE(random_state=42)
    # SMOTE requires 2D input
    X_resampled, y_resampled = sm.fit_resample(X.reshape(len(X), -1), y)
    
    # Reshape back if needed for model
    return X_resampled, y_resampled

if __name__ == "__main__":
    # Test model instantiation and forward pass
    input_dim = 10
    matrix_size = 4
    model = DDoSDetector(input_dim=input_dim, matrix_size=matrix_size)
    
    sample_seq = torch.randn(16, 10, input_dim) # Batch 16, Seq 10, Dim 10
    sample_matrix = torch.randn(16, 1, matrix_size, matrix_size) # Batch 16, 1 channel, 4x4
    
    out = model(sample_seq, sample_matrix)
    print(f"Prediction shape: {out.shape}")
