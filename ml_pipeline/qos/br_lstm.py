import torch
import torch.nn as nn
import torch.nn.functional as F

class BRLSTM(nn.Module):
    """
    Bayesian Regression-Enhanced LSTM (BR-LSTM) for QoS Prediction.
    Outputs a Gaussian distribution (mean and variance) to capture uncertainty.
    """
    def __init__(self, input_dim=3, hidden_dim=64, num_layers=2, dropout=0.2):
        super(BRLSTM, self).__init__()
        
        # LSTM for sequential dependency (Latency, Jitter, Loss)
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        
        # Bayesian Regression Head (Probabilistic Output)
        # We output 2 values: mean (mu) and log-variance (log_var)
        # Using log_var ensures variance is always positive during training
        self.regressor = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 2)
        )

    def forward(self, x):
        # x shape: (batch_size, sequence_length, 3)
        lstm_out, _ = self.lstm(x)
        
        # Take the last hidden state of the sequence
        last_hidden = lstm_out[:, -1, :]
        
        # Predict parameters of the Gaussian distribution
        params = self.regressor(last_hidden)
        mu = params[:, 0:1]
        log_var = params[:, 1:2]
        
        # Convert log_var to variance
        sigma = torch.exp(0.5 * log_var)
        
        return mu, sigma

def gaussian_nll_loss(mu, sigma, target):
    """
    Negative Log-Likelihood loss for Gaussian distribution.
    Encourages the model to minimize error while being aware of its own uncertainty.
    """
    precision = 1.0 / (sigma**2 + 1e-6)
    loss = torch.mean(0.5 * precision * (target - mu)**2 + torch.log(sigma + 1e-6))
    return loss

if __name__ == "__main__":
    # Test model instantiation and forward pass
    model = BRLSTM(input_dim=3, hidden_dim=64)
    sample_input = torch.randn(16, 10, 3) # Batch size 16, Window size 10, Features 3
    mu, sigma = model(sample_input)
    print(f"Mean shape: {mu.shape}, Sigma shape: {sigma.shape}")
