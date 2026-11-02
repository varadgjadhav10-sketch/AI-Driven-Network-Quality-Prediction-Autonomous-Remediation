import argparse
import json
import random
import signal
import sys
import time
from pathlib import Path

from confluent_kafka import Producer


ROOT = Path(__file__).resolve().parents[1]
TOPOLOGY_PATH = ROOT / "network_sim" / "topology.yml"

KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
KAFKA_TOPIC = "network-telemetry-flows"
FALLBACK_NODES = ["spine1", "spine2", "leaf1", "leaf2", "leaf3", "leaf4"]


def load_nodes_from_topology() -> list[str]:
    if not TOPOLOGY_PATH.exists():
        return FALLBACK_NODES

    nodes: list[str] = []
    in_nodes = False
    for raw_line in TOPOLOGY_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if stripped == "nodes:":
            in_nodes = True
            continue
        if in_nodes and stripped == "links:":
            break
        if in_nodes and line.startswith("    ") and not line.startswith("      ") and stripped.endswith(":"):
            nodes.append(stripped[:-1])

    return nodes or FALLBACK_NODES


def normalize_node(value: str, known_nodes: list[str]) -> str:
    token = value.strip().lower()
    if token in known_nodes:
        return token

    for prefix in ("leaf", "spine"):
        if token.startswith(f"{prefix}-"):
            compact = f"{prefix}{token.split('-', 1)[1]}"
            if compact in known_nodes:
                return compact

    raise ValueError(f"Unknown node '{value}'. Available nodes: {', '.join(known_nodes)}")


def build_catastrophic_payload(target_node: str, sequence: int) -> dict:
    packet_count = random.randint(18_000, 65_000)
    duration = random.uniform(0.04, 0.22)
    avg_bytes = random.randint(64, 160)
    byte_count = int(packet_count * avg_bytes * random.uniform(0.92, 1.15))

    return {
        "flow_id": f"chaos-{target_node}-{sequence}",
        "reason": "DDoS_SPIKE",
        "timestamp": time.time(),
        "target_node": target_node,
        "metrics": {
            "packet_count": packet_count,
            "byte_count": byte_count,
            "tcp_flags": ["S", "A", "R"],
            "duration": round(duration, 4),
        },
    }


def delivery_report(err, msg) -> None:
    if err is not None:
        print(f"[CHAOS MONKEY] Delivery failure: {err}")


def run_attack(target_node: str, interval: float, max_events: int | None) -> None:
    producer = Producer(
        {
            "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
            "client.id": "chaos-monkey",
        }
    )

    running = True

    def handle_sigint(sig, frame) -> None:
        nonlocal running
        running = False
        print("\n[CHAOS MONKEY] Retreat order received. Standing down attack simulation...")

    signal.signal(signal.SIGINT, handle_sigint)

    print("=" * 88)
    print("[CHAOS MONKEY] GLOBAL MAYHEM PROTOCOL ACTIVATED")
    print(f"[CHAOS MONKEY] Target node: {target_node}")
    print(f"[CHAOS MONKEY] Kafka broker: {KAFKA_BOOTSTRAP_SERVERS}")
    print(f"[CHAOS MONKEY] Topic: {KAFKA_TOPIC}")
    print("=" * 88)

    sequence = 1
    while running:
        payload = build_catastrophic_payload(target_node, sequence)
        encoded = json.dumps(payload)

        producer.produce(
            KAFKA_TOPIC,
            key=target_node,
            value=encoded,
            callback=delivery_report,
        )
        producer.poll(0)

        metrics = payload["metrics"]
        projected_rate = metrics["packet_count"] / max(metrics["duration"], 1e-6)
        print(
            "[CHAOS MONKEY] Unleashing DDoS on "
            f"{target_node} | packets={metrics['packet_count']} "
            f"duration={metrics['duration']}s "
            f"projected_rate={projected_rate:,.0f} pkt/s"
        )

        if max_events is not None and sequence >= max_events:
            print("[CHAOS MONKEY] Max event count reached. Ending attack simulation.")
            break

        sequence += 1
        time.sleep(interval)

    producer.flush(10)
    print("[CHAOS MONKEY] Attack stream stopped. Kafka producer flushed.")


def main() -> None:
    known_nodes = load_nodes_from_topology()

    parser = argparse.ArgumentParser(
        description="Inject catastrophic DDoS_SPIKE telemetry payloads into Kafka for chaos testing."
    )
    parser.add_argument(
        "--target",
        default="leaf-2",
        help="Node to attack (e.g., leaf-2, spine-1, leaf2)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=1.0,
        help="Seconds between attack events (default: 1.0)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=None,
        help="Stop after N events (default: infinite until Ctrl+C)",
    )
    args = parser.parse_args()

    try:
        target_node = normalize_node(args.target, known_nodes)
    except ValueError as exc:
        print(f"[CHAOS MONKEY] {exc}")
        sys.exit(1)

    run_attack(target_node=target_node, interval=max(args.interval, 0.05), max_events=args.count)


if __name__ == "__main__":
    main()
