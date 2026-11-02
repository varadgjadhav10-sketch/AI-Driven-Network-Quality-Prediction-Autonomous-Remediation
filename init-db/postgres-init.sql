CREATE TABLE IF NOT EXISTS raw_flows (
    id SERIAL PRIMARY KEY,
    flow_id TEXT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    metrics JSONB NOT NULL,
    raw_payload JSONB
);

CREATE INDEX idx_raw_flows_flow_id ON raw_flows (flow_id);
CREATE INDEX idx_raw_flows_captured_at ON raw_flows (captured_at);
