import asyncio
import contextlib
import json
import os
import sys
from collections import defaultdict, deque
from pathlib import Path

import httpx
import redis.asyncio as redis
import torch
from aiokafka import AIOKafkaConsumer
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml_pipeline.ddos.detector import DDoSDetector
from ml_pipeline.qos.br_lstm import BRLSTM

# Configuration
KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
KAFKA_TOPIC = "network-telemetry-flows"
REDIS_URL = "redis://localhost:6379"
REMEDIATION_WEBHOOK_URL = "/api/v1/webhook/remediate"
RESTCONF_PORT = int(os.getenv("RESTCONF_PORT", "443"))
RESTCONF_USERNAME = os.getenv("RESTCONF_USERNAME", "admin")
RESTCONF_PASSWORD = os.getenv("RESTCONF_PASSWORD", "admin")
RESTCONF_VERIFY_TLS = os.getenv("RESTCONF_VERIFY_TLS", "false").lower() == "true"
REMEDIATION_INTERFACE = os.getenv("REMEDIATION_INTERFACE", "e1-1")
DEFAULT_ROUTER_NODES = ["spine1", "spine2", "leaf1", "leaf2", "leaf3", "leaf4"]


def load_router_nodes_from_topology() -> list[str]:
    topology_path = ROOT / "network_sim" / "topology.yml"
    if not topology_path.exists():
        return DEFAULT_ROUTER_NODES

    nodes: list[str] = []
    in_nodes = False
    for raw_line in topology_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if stripped == "nodes:":
            in_nodes = True
            continue
        if in_nodes and stripped == "links:":
            break
        if in_nodes and line.startswith("    ") and not line.startswith("      ") and stripped.endswith(":"):
            nodes.append(stripped[:-1])

    return nodes or DEFAULT_ROUTER_NODES


ROUTER_NODES = load_router_nodes_from_topology()

QOS_SEQ_LEN = 10
QOS_INPUT_DIM = 3
DDOS_SEQ_LEN = 10
DDOS_INPUT_DIM = 10
DDOS_MATRIX_SIZE = 4
DEVICE = torch.device("cpu")

QOS_FEATURE_MEAN = torch.tensor([25.0, 1.5, 0.02], dtype=torch.float32)
QOS_FEATURE_STD = torch.tensor([12.0, 1.2, 0.03], dtype=torch.float32)

DDOS_FEATURE_MEAN = torch.tensor(
    [220.0, 60000.0, 18.0, 450.0, 20.0, 18.0, 0.1, 2.0, 1200.0, 0.15],
    dtype=torch.float32,
)
DDOS_FEATURE_STD = torch.tensor(
    [200.0, 90000.0, 25.0, 600.0, 20.0, 12.0, 0.3, 2.0, 900.0, 0.25],
    dtype=torch.float32,
)


class FeatureScaler:
    def __init__(self, mean: torch.Tensor, std: torch.Tensor):
        self.mean = mean
        self.std = torch.clamp(std, min=1e-6)

    def transform(self, values: list[float]) -> torch.Tensor:
        x = torch.tensor(values, dtype=torch.float32)
        return (x - self.mean) / self.std


class InferenceEngine:
    def __init__(self, qos_model: BRLSTM, ddos_model: DDoSDetector):
        self.qos_model = qos_model.to(DEVICE).eval()
        self.ddos_model = ddos_model.to(DEVICE).eval()
        self.qos_scaler = FeatureScaler(QOS_FEATURE_MEAN, QOS_FEATURE_STD)
        self.ddos_scaler = FeatureScaler(DDOS_FEATURE_MEAN, DDOS_FEATURE_STD)
        self.qos_windows: dict[str, deque[torch.Tensor]] = defaultdict(
            lambda: deque(maxlen=QOS_SEQ_LEN)
        )
        self.ddos_windows: dict[str, deque[torch.Tensor]] = defaultdict(
            lambda: deque(maxlen=DDOS_SEQ_LEN)
        )
        self.prev_rate: dict[str, float] = {}

    def _padded_sequence(
        self, feature_window: deque[torch.Tensor], seq_len: int, input_dim: int
    ) -> torch.Tensor:
        if not feature_window:
            base = torch.zeros(input_dim, dtype=torch.float32)
            feature_window.append(base)
        entries = list(feature_window)
        while len(entries) < seq_len:
            entries.insert(0, entries[0])
        return torch.stack(entries[-seq_len:]).unsqueeze(0)

    def _extract_raw_features(self, flow_data: dict) -> dict[str, float]:
        metrics = flow_data.get("metrics", {})
        packet_count = float(metrics.get("packet_count", 0) or 0)
        byte_count = float(metrics.get("byte_count", 0) or 0)
        duration_sec = max(float(metrics.get("duration", 0) or 0), 1e-6)
        tcp_flags = metrics.get("tcp_flags", []) or []

        rate = packet_count / duration_sec
        utilization = min(100.0, (byte_count * 8.0) / (duration_sec * 1_000_000.0))
        saturation = min(100.0, rate / 1000.0)

        return {
            "packet_count": packet_count,
            "byte_count": byte_count,
            "duration_sec": duration_sec,
            "duration_ms": duration_sec * 1000.0,
            "rate": rate,
            "utilization": utilization,
            "saturation": saturation,
            "bytes_per_packet": byte_count / max(packet_count, 1.0),
            "flag_count": float(len(tcp_flags)),
            "has_rst": 1.0 if ("R" in tcp_flags) else 0.0,
            "has_syn": 1.0 if ("S" in tcp_flags) else 0.0,
            "has_fin": 1.0 if ("F" in tcp_flags) else 0.0,
        }

    def attach_predictions(self, flow_data: dict, payload: dict) -> dict:
        flow_id = str(payload.get("flow_id", "unknown"))
        features = self._extract_raw_features(flow_data)

        prev_rate = self.prev_rate.get(flow_id, features["rate"])
        jitter_proxy = min(abs(features["rate"] - prev_rate) / 150.0, 10.0)
        loss_proxy = min(1.0, 0.02 + 0.08 * features["has_rst"])
        self.prev_rate[flow_id] = features["rate"]

        qos_vector = [features["duration_ms"], jitter_proxy, loss_proxy]
        ddos_vector = [
            features["rate"],
            features["byte_count"],
            features["packet_count"],
            features["duration_ms"],
            features["utilization"],
            features["saturation"],
            features["has_rst"],
            features["flag_count"],
            features["bytes_per_packet"],
            0.5 * features["has_syn"] + 0.5 * features["has_fin"],
        ]

        self.qos_windows[flow_id].append(self.qos_scaler.transform(qos_vector))
        self.ddos_windows[flow_id].append(self.ddos_scaler.transform(ddos_vector))

        x_qos = self._padded_sequence(self.qos_windows[flow_id], QOS_SEQ_LEN, QOS_INPUT_DIM).to(
            DEVICE
        )
        x_ddos_seq = self._padded_sequence(
            self.ddos_windows[flow_id], DDOS_SEQ_LEN, DDOS_INPUT_DIM
        ).to(DEVICE)

        latest_ddos = x_ddos_seq[0, -1]
        ddos_matrix_vals = torch.cat(
            [
                latest_ddos,
                torch.tensor(
                    [
                        latest_ddos[0] * latest_ddos[4],
                        latest_ddos[1] - latest_ddos[8],
                        latest_ddos[3],
                        latest_ddos[6],
                        latest_ddos[7],
                        latest_ddos[9],
                    ],
                    dtype=torch.float32,
                ),
            ]
        )
        x_ddos_matrix = ddos_matrix_vals.view(1, 1, DDOS_MATRIX_SIZE, DDOS_MATRIX_SIZE).to(DEVICE)

        with torch.no_grad():
            mu, sigma = self.qos_model(x_qos)
            ddos_prob = self.ddos_model(x_ddos_seq, x_ddos_matrix)

        predicted_latency = max(0.0, float(mu.squeeze().item()))
        predicted_sigma = max(0.01, float(sigma.squeeze().item()))
        predicted_ddos = min(max(float(ddos_prob.squeeze().item()), 0.0), 1.0)

        payload["qos"]["mu"] = round(predicted_latency, 3)
        payload["qos"]["sigma"] = round(predicted_sigma, 3)
        payload["ddos"]["probability"] = round(predicted_ddos, 4)
        payload["predictions"] = {
            "predicted_latency": round(predicted_latency, 3),
            "predicted_sigma": round(predicted_sigma, 3),
            "ddos_probability": round(predicted_ddos, 4),
        }
        payload["ai"] = {
            "predicted_latency": round(predicted_latency, 3),
            "ddos_probability": round(predicted_ddos, 4),
        }
        return payload


def load_inference_engine() -> InferenceEngine | None:
    weights_dir = ROOT / "ml_pipeline" / "weights"
    qos_path = weights_dir / "br_lstm.pth"
    ddos_path = weights_dir / "detector.pth"

    if not qos_path.exists() or not ddos_path.exists():
        print(
            f"Inference disabled: missing weights in {weights_dir}. "
            "Run ml_pipeline/scripts/train_all.py first."
        )
        return None

    qos_model = BRLSTM(input_dim=QOS_INPUT_DIM, hidden_dim=64)
    ddos_model = DDoSDetector(input_dim=DDOS_INPUT_DIM, matrix_size=DDOS_MATRIX_SIZE, hidden_dim=64)

    qos_model.load_state_dict(torch.load(qos_path, map_location=DEVICE))
    ddos_model.load_state_dict(torch.load(ddos_path, map_location=DEVICE))
    print(f"Loaded BR-LSTM weights from {qos_path}")
    print(f"Loaded DDoS weights from {ddos_path}")
    return InferenceEngine(qos_model, ddos_model)


class TelemetryBroadcaster:
    def __init__(self):
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._clients.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self._clients.discard(websocket)

    async def broadcast(self, payload: dict):
        async with self._lock:
            clients = list(self._clients)

        if not clients:
            return

        stale_clients = []
        for client in clients:
            try:
                await client.send_json(payload)
            except Exception:
                stale_clients.append(client)

        if stale_clients:
            async with self._lock:
                for client in stale_clients:
                    self._clients.discard(client)

    async def client_count(self) -> int:
        async with self._lock:
            return len(self._clients)


def build_telemetry_payload(flow_data: dict) -> dict:
    metrics = flow_data.get("metrics", {})
    packet_count = float(metrics.get("packet_count", 0) or 0)
    byte_count = float(metrics.get("byte_count", 0) or 0)
    duration_sec = float(metrics.get("duration", 0) or 0)
    duration_sec = max(duration_sec, 1e-6)
    tcp_flags = metrics.get("tcp_flags", []) or []

    rate = packet_count / duration_sec
    errors = 1 if ("R" in tcp_flags) else 0
    utilization = min(100.0, (byte_count * 8.0) / (duration_sec * 1_000_000.0))
    saturation = min(100.0, rate / 1000.0)
    ddos_probability = min(1.0, rate / 5000.0)

    return {
        "flow_id": flow_data.get("flow_id", "unknown"),
        "timestamp": flow_data.get("timestamp"),
        "reason": flow_data.get("reason"),
        "metrics": {
            "rate": round(rate, 3),
            "errors": errors,
            "duration": round(duration_sec * 1000.0, 3),
            "utilization": round(utilization, 3),
            "saturation": round(saturation, 3),
        },
        "qos": {
            "mu": round(duration_sec * 1000.0, 3),
            "sigma": round(max(duration_sec * 100.0, 0.1), 3),
        },
        "ddos": {
            "probability": round(ddos_probability, 4),
        },
        "rca": {
            "root_cause_node": "unknown",
            "confidence": 0.0,
        },
        "raw": flow_data,
    }


broadcaster = TelemetryBroadcaster()


async def consume_telemetry(inference_engine: InferenceEngine | None):
    """
    Background task to consume from Kafka, run inference, and sink to Redis.
    """
    consumer = AIOKafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id="inference-engine-group",
        auto_offset_reset="latest",
    )

    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    await consumer.start()

    try:
        async for msg in consumer:
            try:
                raw = msg.value.decode("utf-8") if isinstance(msg.value, (bytes, bytearray)) else msg.value
                flow_data = json.loads(raw)
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                print(f"Skipping invalid Kafka payload: {exc}")
                continue

            telemetry_payload = build_telemetry_payload(flow_data)
            if inference_engine is not None:
                telemetry_payload = inference_engine.attach_predictions(flow_data, telemetry_payload)
            flow_id = telemetry_payload.get("flow_id", "unknown")

            ai_pred = telemetry_payload.get("ai", {})
            if ai_pred:
                print(
                    "AI inference "
                    f"flow={flow_id} "
                    f"latency_ms={ai_pred.get('predicted_latency')} "
                    f"ddos_prob={ai_pred.get('ddos_probability')}"
                )

            # Broadcast immediately to all connected WebSocket clients.
            await broadcaster.broadcast(telemetry_payload)

            # Sink selected fields to Redis TimeSeries.
            try:
                await redis_client.execute_command("TS.ADD", f"qos:mu:{flow_id}", "*", telemetry_payload["qos"]["mu"])
                await redis_client.execute_command("TS.ADD", f"qos:sigma:{flow_id}", "*", telemetry_payload["qos"]["sigma"])
                await redis_client.execute_command(
                    "TS.ADD", f"ddos:prob:{flow_id}", "*", telemetry_payload["ddos"]["probability"]
                )
            except Exception as exc:
                print(f"Redis sink warning for flow {flow_id}: {exc}")

            # Closed-loop trigger on heuristic probability.
            if telemetry_payload["ddos"]["probability"] > 0.9:
                await trigger_remediation(
                    flow_id,
                    "DDoS_DETECTED",
                    telemetry_payload["ddos"]["probability"],
                )

    finally:
        await consumer.stop()
        await redis_client.close()

def build_shutdown_interface_payload(interface_name: str, reason: str) -> dict:
    return {
        "ietf-interfaces:interface": {
            "name": interface_name,
            "description": f"AI remediation: {reason}",
            "enabled": False,
        }
    }


def build_qos_rate_limit_payload(interface_name: str, dscp_value: str = "AF11") -> dict:
    return {
        "srl_nokia-qos:interface": {
            "interface-name": interface_name,
            "input": {
                "classifier-policy": "AI-TRAFFIC-THROTTLE",
            },
            "output": {
                "rewrite": {
                    "dscp": dscp_value,
                },
                "queue-policy": "AI-THROTTLE-QUEUE-POLICY",
            },
        }
    }


def build_bgp_metric_payload(med: int) -> dict:
    return {
        "srl_nokia-routing-policy:policy": {
            "name": "AI-REMEDIATION-POLICY",
            "statement": [
                {
                    "name": "set-med",
                    "action": {
                        "bgp-actions": {
                            "set-med": med,
                        }
                    },
                }
            ],
        }
    }


def pick_target_node(node_hint: str | None) -> str:
    hint = (node_hint or "").strip()
    if hint in ROUTER_NODES:
        return hint
    if hint:
        return ROUTER_NODES[abs(hash(hint)) % len(ROUTER_NODES)]
    return ROUTER_NODES[0]


def normalize_node_name(raw_node: str | None) -> str | None:
    if raw_node is None:
        return None
    token = raw_node.strip().lower()
    if not token:
        return None

    if token in ROUTER_NODES:
        return token

    for prefix in ("leaf", "spine"):
        if token.startswith(f"{prefix}-"):
            compact = f"{prefix}{token.split('-', 1)[1]}"
            if compact in ROUTER_NODES:
                return compact
        if token.startswith(prefix) and len(token) > len(prefix):
            suffix = token[len(prefix) :]
            if suffix.isdigit():
                compact = f"{prefix}{suffix}"
                if compact in ROUTER_NODES:
                    return compact

    return None


def parse_intent_command(command: str) -> dict:
    lowered = command.strip().lower()

    action = None
    if any(word in lowered for word in ("throttle", "rate-limit", "rate limit", "qos", "dscp")):
        action = "throttle"
    elif any(word in lowered for word in ("isolate", "shutdown", "shut down", "disable")):
        action = "isolate"

    found_node = None
    for node in ROUTER_NODES:
        hyphen_name = node.replace("leaf", "leaf-").replace("spine", "spine-")
        if node in lowered or hyphen_name in lowered:
            found_node = node
            break

    return {
        "action": action,
        "node": found_node,
    }


async def send_restconf_patch(
    target_node: str,
    action: str,
    threat_score: float,
    url: str,
    payload: dict,
) -> dict:
    headers = {
        "Accept": "application/yang-data+json",
        "Content-Type": "application/yang-data+json",
    }

    print(
        "REMEDIATION request "
        f"node={target_node} action={action} threat_score={threat_score:.4f} "
        f"url={url} payload={json.dumps(payload)}"
    )

    try:
        async with httpx.AsyncClient(
            verify=RESTCONF_VERIFY_TLS,
            timeout=httpx.Timeout(8.0, connect=5.0),
            auth=(RESTCONF_USERNAME, RESTCONF_PASSWORD),
        ) as client:
            response = await client.patch(url, headers=headers, json=payload)

        print(
            "REMEDIATION response "
            f"node={target_node} status={response.status_code} body={response.text[:400]}"
        )
        return {
            "status": "success" if response.is_success else "error",
            "target_node": target_node,
            "action": action,
            "http_status": response.status_code,
            "response": response.text[:400],
        }
    except Exception as exc:
        print(
            "REMEDIATION error "
            f"node={target_node} action={action} error={type(exc).__name__}: {exc}"
        )
        return {
            "status": "error",
            "target_node": target_node,
            "action": action,
            "error": str(exc),
        }


async def execute_remediation(
    node_hint: str,
    reason: str,
    threat_score: float,
    preferred_action: str | None = None,
) -> dict:
    target_node = pick_target_node(node_hint)
    clamped_score = max(0.0, min(1.0, float(threat_score)))
    action = preferred_action or ("shutdown_interface" if clamped_score >= 0.9 else "bgp_metric")

    if action == "shutdown_interface":
        url = (
            f"https://{target_node}:{RESTCONF_PORT}/restconf/data/"
            f"ietf-interfaces:interfaces/interface={REMEDIATION_INTERFACE}"
        )
        payload = build_shutdown_interface_payload(REMEDIATION_INTERFACE, reason)
    elif action == "qos_throttle":
        url = (
            f"https://{target_node}:{RESTCONF_PORT}/restconf/data/"
            f"srl_nokia-qos:qos/interface={REMEDIATION_INTERFACE}"
        )
        payload = build_qos_rate_limit_payload(REMEDIATION_INTERFACE, dscp_value="AF11")
    else:
        med = int(50 + clamped_score * 200)
        url = (
            f"https://{target_node}:{RESTCONF_PORT}/restconf/data/"
            "srl_nokia-routing-policy:routing-policy"
        )
        payload = build_bgp_metric_payload(med)

    return await send_restconf_patch(
        target_node=target_node,
        action=action,
        threat_score=clamped_score,
        url=url,
        payload=payload,
    )


async def trigger_remediation(node_id, reason, threat_score):
    """
    Internal helper to trigger closed-loop network remediation.
    """
    print(
        f"ALERT: Critical anomaly detected on {node_id} ({reason}) "
        f"threat={float(threat_score):.4f}. Triggering remediation..."
    )
    await execute_remediation(str(node_id), str(reason), float(threat_score))

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.inference_engine = load_inference_engine()
    print("Starting telemetry consumer...")
    task = asyncio.create_task(consume_telemetry(app.state.inference_engine))
    app.state.consumer_task = task
    yield

    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task

app = FastAPI(title="Network Telemetry Inference Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/telemetry")
async def telemetry_ws(websocket: WebSocket):
    await broadcaster.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await broadcaster.disconnect(websocket)
    except Exception:
        await broadcaster.disconnect(websocket)

@app.post("/api/v1/webhook/remediate")
async def remediate(payload: dict):
    """
    Closed-loop automation endpoint. 
    Generates a RESTCONF payload to isolate/reroute traffic.
    """
    node_id = str(payload.get("node_id", "unknown"))
    reason = str(payload.get("reason", "manual_trigger"))
    threat_score = float(payload.get("threat_score", payload.get("ddos_probability", 1.0)))

    result = await execute_remediation(node_id, reason, threat_score)
    return {
        "status": result.get("status", "error"),
        "node_id": result.get("target_node", node_id),
        "action": result.get("action"),
        "threat_score": threat_score,
        "details": result,
    }


class IntentRequest(BaseModel):
    command: str


@app.post("/api/v1/intent")
async def intent_router(intent: IntentRequest):
    parsed = parse_intent_command(intent.command)
    action = parsed.get("action")
    parsed_node = normalize_node_name(parsed.get("node"))

    if action is None:
        return {
            "status": "error",
            "message": "Intent not recognized. Use isolate/shutdown/throttle with a node name.",
            "received": intent.command,
        }

    if parsed_node is None:
        return {
            "status": "error",
            "message": f"Could not parse a valid node from command. Known nodes: {', '.join(ROUTER_NODES)}",
            "received": intent.command,
        }

    preferred_action = "qos_throttle" if action == "throttle" else "shutdown_interface"
    reason = f"IBN_INTENT:{action.upper()}"
    threat_score = 0.95 if action == "isolate" else 0.60

    result = await execute_remediation(
        node_hint=parsed_node,
        reason=reason,
        threat_score=threat_score,
        preferred_action=preferred_action,
    )

    return {
        "status": result.get("status", "error"),
        "intent": intent.command,
        "parsed": {
            "action": action,
            "node": parsed_node,
            "resolved_action": preferred_action,
        },
        "details": result,
    }

@app.get("/health")
async def health():
    return {
        "status": "running",
        "kafka_topic": KAFKA_TOPIC,
        "connected_ws_clients": await broadcaster.client_count(),
        "models_loaded": app.state.inference_engine is not None,
    }
