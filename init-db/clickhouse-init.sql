CREATE DATABASE IF NOT EXISTS telemetry;

CREATE TABLE IF NOT EXISTS telemetry.flow_history (
    flow_id String,
    reason String,
    packet_count UInt64,
    byte_count UInt64,
    tcp_flags Array(String),
    duration Float64,
    timestamp DateTime64(3, 'UTC')
) ENGINE = MergeTree()
ORDER BY (timestamp, flow_id);
