import json
import random
import signal
import time
from typing import Any

from confluent_kafka import Producer


KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
KAFKA_TOPIC = "network-telemetry-flows"
PUBLISH_INTERVAL_SECONDS = 1.0


def delivery_report(err, msg) -> None:
    if err is not None:
        print(f"Delivery failed: {err}")


def build_payload(tick: int) -> dict[str, Any]:
    flow_id = f"mock-flow-{(tick % 4) + 1}"

    is_ddos_spike = random.random() < 0.12
    if is_ddos_spike:
        packet_count = random.randint(2500, 7000)
        duration = random.uniform(0.15, 0.7)
        avg_bytes_per_packet = random.randint(60, 140)
        tcp_flags = ["S", "A"]
        reason = "DDoS_SPIKE"
    else:
        packet_count = random.randint(80, 900)
        duration = random.uniform(0.8, 4.5)
        avg_bytes_per_packet = random.randint(300, 1200)
        tcp_flags = ["A"]
        if random.random() < 0.05:
            tcp_flags.append("R")
        reason = "NORMAL"

    byte_count = int(packet_count * avg_bytes_per_packet * random.uniform(0.9, 1.1))

    return {
        "flow_id": flow_id,
        "reason": reason,
        "timestamp": time.time(),
        "metrics": {
            "packet_count": packet_count,
            "byte_count": byte_count,
            "tcp_flags": tcp_flags,
            "duration": round(duration, 4),
        },
    }


def main() -> None:
    producer = Producer(
        {
            "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
            "client.id": "mock-traffic-producer",
        }
    )

    running = True

    def handle_sigint(sig, frame) -> None:
        nonlocal running
        running = False
        print("\nStopping mock traffic producer...")

    signal.signal(signal.SIGINT, handle_sigint)

    print(
        f"Producing synthetic telemetry to {KAFKA_BOOTSTRAP_SERVERS} "
        f"topic={KAFKA_TOPIC} every {PUBLISH_INTERVAL_SECONDS:.1f}s"
    )

    tick = 0
    while running:
        payload = build_payload(tick)
        value = json.dumps(payload)

        producer.produce(
            KAFKA_TOPIC,
            key=payload["flow_id"],
            value=value,
            callback=delivery_report,
        )
        producer.poll(0)

        metrics = payload["metrics"]
        print(
            f"sent flow={payload['flow_id']} reason={payload['reason']} "
            f"packets={metrics['packet_count']} duration={metrics['duration']}s"
        )

        tick += 1
        time.sleep(PUBLISH_INTERVAL_SECONDS)

    producer.flush(10)
    print("Producer stopped.")


if __name__ == "__main__":
    main()
