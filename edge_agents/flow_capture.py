import sys
import json
import time
import signal
import threading
from scapy.all import sniff, IP, TCP, UDP
from collections import defaultdict
from confluent_kafka import Producer

# --- Configuration ---
TIMEOUT_SECONDS = 120
KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
KAFKA_TOPIC = "network-telemetry-flows"
INTERFACE = None  # None means sniff on all interfaces

# --- Kafka Producer Initialization ---
producer_config = {
    'bootstrap.servers': KAFKA_BOOTSTRAP_SERVERS,
    'client.id': 'edge-flow-agent'
}
producer = Producer(producer_config)

def delivery_report(err, msg):
    """ Called once for each message produced to indicate delivery result.
        Triggered by poll() or flush(). """
    if err is not None:
        print(f"Message delivery failed: {err}")
    else:
        pass # Successfully delivered

# --- State ---
# Key: (canonical_tuple, protocol)
# Value: { 'packets': 0, 'bytes': 0, 'flags': set(), 'start_time': 0, 'last_seen': 0, 'forward': {}, 'backward': {} }
flows = {}
flow_lock = threading.Lock()

def get_canonical_key(packet):
    """
    Returns a canonical 5-tuple for bidirectional flow grouping.
    """
    if IP not in packet:
        return None
    
    src_ip = packet[IP].src
    dst_ip = packet[IP].dst
    proto = packet[IP].proto
    
    src_port = 0
    dst_port = 0
    
    if TCP in packet:
        src_port = packet[TCP].sport
        dst_port = packet[TCP].dport
    elif UDP in packet:
        src_port = packet[UDP].sport
        dst_port = packet[UDP].dport
    else:
        # Non-TCP/UDP IP traffic
        pass

    # Create canonical key by sorting endpoints
    endpoints = sorted([(src_ip, src_port), (dst_ip, dst_port)])
    return (tuple(endpoints), proto)

def export_flow(flow_key, flow_data, reason):
    """
    Exports a single flow to Kafka.
    """
    output = {
        "flow_id": str(flow_key),
        "reason": reason,
        "metrics": {
            "packet_count": flow_data['packets'],
            "byte_count": flow_data['bytes'],
            "tcp_flags": list(flow_data['flags']),
            "duration": flow_data['last_seen'] - flow_data['start_time']
        },
        "timestamp": time.time()
    }
    
    try:
        producer.produce(
            KAFKA_TOPIC, 
            key=str(flow_key), 
            value=json.dumps(output), 
            on_delivery=delivery_report
        )
        # Serve delivery reports (callbacks) from previous produce calls
        producer.poll(0)
    except Exception as e:
        print(f"Error producing to Kafka: {e}")

def packet_callback(packet):
    """
    Process each captured packet.
    """
    if IP not in packet:
        return

    key = get_canonical_key(packet)
    if not key:
        return

    pkt_len = len(packet)
    now = time.time()
    
    flags = set()
    is_fin_rst = False
    if TCP in packet:
        # Extract TCP flags
        f_val = packet[TCP].flags
        # Scapy flags are usually a string or bitmask depending on version/access
        # Let's use the string representation for readability in JSON
        flags_str = packet[TCP].underlayer.sprintf("%TCP.flags%")
        for char in flags_str:
            if char in "FSRPAU":
                flags.add(char)
        
        if 'F' in flags or 'R' in flags:
            is_fin_rst = True

    with flow_lock:
        if key not in flows:
            flows[key] = {
                'packets': 0,
                'bytes': 0,
                'flags': set(),
                'start_time': now,
                'last_seen': now
            }
        
        flow = flows[key]
        flow['packets'] += 1
        flow['bytes'] += pkt_len
        flow['flags'].update(flags)
        flow['last_seen'] = now

        if is_fin_rst:
            export_flow(key, flow, "TCP_TERMINATION")
            del flows[key]

def timeout_monitor():
    """
    Background thread to clean up flows that hit the timeout.
    """
    while True:
        time.sleep(10)
        now = time.time()
        expired_keys = []
        
        with flow_lock:
            for key, data in flows.items():
                if now - data['last_seen'] > TIMEOUT_SECONDS:
                    expired_keys.append(key)
            
            for key in expired_keys:
                export_flow(key, flows[key], "TIMEOUT")
                del flows[key]

def signal_handler(sig, frame):
    print("\nStopping capture and exporting remaining flows...")
    with flow_lock:
        for key, data in flows.items():
            export_flow(key, data, "PROCESS_EXIT")
    # Wait for any outstanding messages to be delivered and delivery report callbacks to be triggered.
    print("Flushing Kafka producer...")
    producer.flush()
    sys.exit(0)

if __name__ == "__main__":
    print(f"Starting optimized edge flow capture on {INTERFACE if INTERFACE else 'all interfaces'}...")
    print(f"Timeout: {TIMEOUT_SECONDS}s, Publishing to Kafka: {KAFKA_BOOTSTRAP_SERVERS} -> {KAFKA_TOPIC}")
    
    signal.signal(signal.SIGINT, signal_handler)
    
    # Start timeout monitor thread
    monitor_thread = threading.Thread(target=timeout_monitor, daemon=True)
    monitor_thread.start()
    
    # Start sniffing
    # store=0 is crucial for optimization so scapy doesn't keep all packets in memory
    sniff(iface=INTERFACE, prn=packet_callback, store=0)
