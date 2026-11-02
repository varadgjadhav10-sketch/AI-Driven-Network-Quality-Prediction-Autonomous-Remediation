import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GCNConv, global_mean_pool

class GSLModule(nn.Module):
    """
    Graph Structure Learning (GSL) Module.
    Dynamically computes a weighted adjacency matrix from raw KPI node feature vectors.
    """
    def __init__(self, in_channels, hidden_channels):
        super(GSLModule, self).__init__()
        # MLP for embedding node features to compute similarity
        self.embedding = nn.Sequential(
            nn.Linear(in_channels, hidden_channels),
            nn.ReLU(),
            nn.Linear(hidden_channels, hidden_channels)
        )
        # Learnable threshold for edge pruning
        self.threshold = nn.Parameter(torch.tensor(0.5))

    def forward(self, x):
        """
        x: (num_nodes, in_channels)
        """
        # Embed node features
        h = self.embedding(x)
        
        # Compute pairwise similarity (cosine similarity)
        # Normalized features
        h_norm = F.normalize(h, p=2, dim=1)
        # (num_nodes, num_nodes) adjacency matrix
        adj = torch.matmul(h_norm, h_norm.t())
        
        # Apply learnable threshold for sparse adjacency matrix
        adj = F.relu(adj - self.threshold)
        
        # Normalize adjacency matrix (Self-loops included)
        adj = adj + torch.eye(adj.size(0), device=adj.device)
        D = torch.sum(adj, dim=1)
        D_inv_sqrt = torch.pow(D, -0.5)
        D_inv_sqrt[torch.isinf(D_inv_sqrt)] = 0.0
        adj_normalized = D_inv_sqrt.view(-1, 1) * adj * D_inv_sqrt.view(1, -1)
        
        return adj_normalized

class RCAGNN(nn.Module):
    """
    Graph Neural Network with Graph Structure Learning (GSL) for Root Cause Analysis.
    """
    def __init__(self, in_channels, hidden_channels, out_channels):
        super(RCAGNN, self).__init__()
        
        # Graph Structure Learning Module
        self.gsl = GSLModule(in_channels, hidden_channels)
        
        # GNN Layers (GCN)
        self.conv1 = GCNConv(in_channels, hidden_channels)
        self.conv2 = GCNConv(hidden_channels, out_channels)

    def forward(self, x, edge_index=None, batch=None):
        """
        x: (num_nodes, in_channels)
        edge_index: (2, num_edges) - Optional, can be computed by GSL
        batch: (num_nodes) - Node to graph mapping
        """
        # 1. Dynamic Graph Structure Learning
        # GSL computes a weighted adjacency matrix 'adj_hat'
        adj_hat = self.gsl(x)
        
        # Convert weighted adj to edge_index and edge_weight for PyG
        # For simplicity in this offline phase, we use the weighted adj directly in GCN
        # or convert it to edge_index if needed.
        # Let's use the dense GCN logic or convert it.
        
        # Extract edge_index and edge_weight from adj_hat for PyG Conv
        indices = torch.where(adj_hat > 0)
        dynamic_edge_index = torch.stack(indices, dim=0)
        dynamic_edge_weight = adj_hat[indices]
        
        # 2. GNN Propagation
        h = self.conv1(x, dynamic_edge_index, dynamic_edge_weight)
        h = F.relu(h)
        h = F.dropout(h, p=0.2, training=self.training)
        
        h = self.conv2(h, dynamic_edge_index, dynamic_edge_weight)
        
        # 3. Global Pooling (if predicting graph-level root cause)
        if batch is not None:
            h = global_mean_pool(h, batch)
            
        return h

if __name__ == "__main__":
    # Test RCA GNN with GSL
    num_nodes = 20
    in_channels = 16
    hidden_channels = 32
    out_channels = 5 # 5 potential root cause categories
    
    model = RCAGNN(in_channels, hidden_channels, out_channels)
    x = torch.randn(num_nodes, in_channels) # 20 nodes, 16 KPI features each
    
    out = model(x)
    print(f"RCA Output shape: {out.shape}") # (num_nodes, out_channels)
