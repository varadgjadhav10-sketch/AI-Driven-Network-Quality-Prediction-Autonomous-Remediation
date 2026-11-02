from __future__ import annotations

from pathlib import Path
import sys

import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.optim import Adam
from torch.utils.data import DataLoader, TensorDataset

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml_pipeline.ddos.detector import DDoSDetector
from ml_pipeline.qos.br_lstm import BRLSTM, gaussian_nll_loss
from ml_pipeline.rca.gnn_gsl import RCAGNN


SEED = 42
DEVICE = torch.device("cpu")


def set_seed(seed: int = SEED) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)


def generate_qos_dataframe(num_flows: int = 256, seq_len: int = 10) -> pd.DataFrame:
    rows = []
    for flow_id in range(num_flows):
        base_latency = np.random.uniform(8.0, 35.0)
        jitter_scale = np.random.uniform(0.5, 4.0)
        loss_rate = np.random.uniform(0.0, 0.05)
        trend = np.random.uniform(-0.2, 0.4)
        for step in range(seq_len):
            jitter = abs(np.random.normal(0.0, jitter_scale))
            loss = max(0.0, np.random.normal(loss_rate, 0.01))
            latency = base_latency + trend * step + jitter * 0.6 + loss * 120
            rows.append(
                {
                    "flow_id": flow_id,
                    "step": step,
                    "latency": latency,
                    "jitter": jitter,
                    "loss": loss,
                }
            )
    df = pd.DataFrame(rows)
    target = (
        df.groupby("flow_id")["latency"].last().to_numpy()
        + np.random.normal(0.0, 0.8, size=num_flows)
    )
    df = df.merge(pd.DataFrame({"flow_id": np.arange(num_flows), "target": target}), on="flow_id")
    return df


def qos_tensors_from_df(df: pd.DataFrame, seq_len: int = 10) -> tuple[torch.Tensor, torch.Tensor]:
    grouped = df.sort_values(["flow_id", "step"]).groupby("flow_id")
    x = grouped[["latency", "jitter", "loss"]].apply(lambda g: g.to_numpy()).to_list()
    y = grouped["target"].first().to_numpy()
    x_tensor = torch.tensor(np.stack(x), dtype=torch.float32)
    y_tensor = torch.tensor(y.reshape(-1, 1), dtype=torch.float32)
    if x_tensor.shape[1] != seq_len:
        raise ValueError(f"Expected seq_len={seq_len}, got {x_tensor.shape[1]}")
    return x_tensor, y_tensor


def generate_ddos_dataframes(num_samples: int = 320, seq_len: int = 10, input_dim: int = 10, matrix_size: int = 4) -> tuple[pd.DataFrame, pd.DataFrame]:
    seq_rows = []
    matrix_rows = []

    for sample_id in range(num_samples):
        is_attack = np.random.rand() < 0.35
        burst = np.random.uniform(1.6, 3.0) if is_attack else np.random.uniform(0.7, 1.2)
        for step in range(seq_len):
            features = np.random.normal(loc=0.0, scale=0.6, size=input_dim)
            features[0] += burst
            features[1] += burst * 0.5
            features[2] += np.random.uniform(0.0, 1.0) * burst
            seq_rows.append(
                {
                    "sample_id": sample_id,
                    "step": step,
                    **{f"f{i}": float(features[i]) for i in range(input_dim)},
                    "label": int(is_attack),
                }
            )

        base_matrix = np.random.normal(0.0, 0.4, size=(matrix_size, matrix_size))
        if is_attack:
            hotspot = np.random.randint(0, matrix_size)
            base_matrix[hotspot, :] += np.random.uniform(1.0, 2.0)
            base_matrix[:, hotspot] += np.random.uniform(1.0, 2.0)

        matrix_rows.append(
            {
                "sample_id": sample_id,
                **{f"m{i}": float(v) for i, v in enumerate(base_matrix.reshape(-1))},
                "label": int(is_attack),
            }
        )

    return pd.DataFrame(seq_rows), pd.DataFrame(matrix_rows)


def ddos_tensors_from_dfs(seq_df: pd.DataFrame, matrix_df: pd.DataFrame, seq_len: int = 10, input_dim: int = 10, matrix_size: int = 4) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    grouped = seq_df.sort_values(["sample_id", "step"]).groupby("sample_id")
    x_seq = grouped[[f"f{i}" for i in range(input_dim)]].apply(lambda g: g.to_numpy()).to_list()
    y = grouped["label"].first().to_numpy()

    matrix_df = matrix_df.sort_values("sample_id")
    x_matrix = matrix_df[[f"m{i}" for i in range(matrix_size * matrix_size)]].to_numpy().reshape(-1, 1, matrix_size, matrix_size)

    x_seq_t = torch.tensor(np.stack(x_seq), dtype=torch.float32)
    x_matrix_t = torch.tensor(x_matrix, dtype=torch.float32)
    y_t = torch.tensor(y.reshape(-1, 1), dtype=torch.float32)

    if x_seq_t.shape[1] != seq_len:
        raise ValueError(f"Expected seq_len={seq_len}, got {x_seq_t.shape[1]}")
    return x_seq_t, x_matrix_t, y_t


def generate_rca_dataframes(num_graphs: int = 120, nodes_per_graph: int = 20, in_channels: int = 16) -> tuple[pd.DataFrame, pd.DataFrame]:
    node_rows = []
    edge_rows = []

    for graph_id in range(num_graphs):
        hotspot_class = np.random.randint(0, 5)
        hotspot_node = np.random.randint(0, nodes_per_graph)
        for node_id in range(nodes_per_graph):
            base = np.random.normal(0.0, 0.6, size=in_channels)
            if node_id == hotspot_node:
                base[hotspot_class] += np.random.uniform(2.0, 3.5)
                label = hotspot_class
            else:
                label = np.random.randint(0, 5)

            node_rows.append(
                {
                    "graph_id": graph_id,
                    "node_id": node_id,
                    **{f"k{i}": float(base[i]) for i in range(in_channels)},
                    "label": int(label),
                }
            )

            if node_id < nodes_per_graph - 1:
                edge_rows.append(
                    {
                        "graph_id": graph_id,
                        "source": node_id,
                        "target": node_id + 1,
                    }
                )

        extra_edges = np.random.randint(nodes_per_graph // 2, nodes_per_graph)
        for _ in range(extra_edges):
            src = np.random.randint(0, nodes_per_graph)
            dst = np.random.randint(0, nodes_per_graph)
            if src != dst:
                edge_rows.append({"graph_id": graph_id, "source": src, "target": dst})

    return pd.DataFrame(node_rows), pd.DataFrame(edge_rows)


def train_qos_model(epochs: int = 12) -> BRLSTM:
    df = generate_qos_dataframe()
    x, y = qos_tensors_from_df(df)
    loader = DataLoader(TensorDataset(x, y), batch_size=32, shuffle=True)

    model = BRLSTM(input_dim=3, hidden_dim=64).to(DEVICE)
    optimizer = Adam(model.parameters(), lr=1e-3)

    model.train()
    for epoch in range(1, epochs + 1):
        epoch_loss = 0.0
        for batch_x, batch_y in loader:
            batch_x = batch_x.to(DEVICE)
            batch_y = batch_y.to(DEVICE)
            optimizer.zero_grad()
            mu, sigma = model(batch_x)
            loss = gaussian_nll_loss(mu, sigma, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        print(f"[QoS] Epoch {epoch:02d}/{epochs} - loss: {epoch_loss / len(loader):.4f}")

    return model


def train_ddos_model(epochs: int = 10) -> DDoSDetector:
    seq_df, matrix_df = generate_ddos_dataframes()
    x_seq, x_matrix, y = ddos_tensors_from_dfs(seq_df, matrix_df)
    loader = DataLoader(TensorDataset(x_seq, x_matrix, y), batch_size=32, shuffle=True)

    model = DDoSDetector(input_dim=10, matrix_size=4).to(DEVICE)
    criterion = nn.BCELoss()
    optimizer = Adam(model.parameters(), lr=1e-3)

    model.train()
    for epoch in range(1, epochs + 1):
        epoch_loss = 0.0
        for batch_seq, batch_matrix, batch_y in loader:
            batch_seq = batch_seq.to(DEVICE)
            batch_matrix = batch_matrix.to(DEVICE)
            batch_y = batch_y.to(DEVICE)

            optimizer.zero_grad()
            pred = model(batch_seq, batch_matrix)
            loss = criterion(pred, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        print(f"[DDoS] Epoch {epoch:02d}/{epochs} - loss: {epoch_loss / len(loader):.4f}")

    return model


def train_rca_model(epochs: int = 14) -> RCAGNN:
    nodes_df, edges_df = generate_rca_dataframes()
    print(f"[RCA] Synthetic graphs: {nodes_df['graph_id'].nunique()}, edges: {len(edges_df)}")

    model = RCAGNN(in_channels=16, hidden_channels=32, out_channels=5).to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = Adam(model.parameters(), lr=1e-3)

    grouped = nodes_df.groupby("graph_id")
    model.train()
    for epoch in range(1, epochs + 1):
        epoch_loss = 0.0
        for graph_id, graph_nodes in grouped:
            x = torch.tensor(graph_nodes[[f"k{i}" for i in range(16)]].to_numpy(), dtype=torch.float32, device=DEVICE)
            y = torch.tensor(graph_nodes["label"].to_numpy(), dtype=torch.long, device=DEVICE)

            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        print(f"[RCA] Epoch {epoch:02d}/{epochs} - loss: {epoch_loss / len(grouped):.4f}")

    return model


def save_weights(br_lstm: BRLSTM, ddos: DDoSDetector, gnn: RCAGNN) -> None:
    weights_dir = Path("ml_pipeline") / "weights"
    weights_dir.mkdir(parents=True, exist_ok=True)

    qos_path = weights_dir / "br_lstm.pth"
    ddos_path = weights_dir / "detector.pth"
    rca_path = weights_dir / "gnn.pth"

    torch.save(br_lstm.state_dict(), qos_path)
    torch.save(ddos.state_dict(), ddos_path)
    torch.save(gnn.state_dict(), rca_path)

    print(f"Saved QoS model weights -> {qos_path}")
    print(f"Saved DDoS model weights -> {ddos_path}")
    print(f"Saved RCA model weights -> {rca_path}")


def main() -> None:
    set_seed()
    print("Starting synthetic training for BR-LSTM, DDoS detector, and RCA GNN...")

    qos_model = train_qos_model()
    ddos_model = train_ddos_model()
    rca_model = train_rca_model()

    save_weights(qos_model, ddos_model, rca_model)
    print("Training completed.")


if __name__ == "__main__":
    main()
