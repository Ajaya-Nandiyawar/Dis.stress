-- DIST.RESS Signal Network - Database Schema
-- Run this file against your PostgreSQL database to create all tables.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SOS Signals Table
-- ============================================
CREATE TABLE IF NOT EXISTS sos_signals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       VARCHAR(255) NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  message       TEXT,
  severity      VARCHAR(50) NOT NULL DEFAULT 'medium',
  status        VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Alerts Table
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id     UUID REFERENCES sos_signals(id) ON DELETE CASCADE,
  type          VARCHAR(100) NOT NULL,
  radius_km     DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  payload       JSONB,
  dispatched    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Responders Table
-- ============================================
CREATE TABLE IF NOT EXISTS responders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  role          VARCHAR(100) NOT NULL,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  status        VARCHAR(50) NOT NULL DEFAULT 'available',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Routes Table
-- ============================================
CREATE TABLE IF NOT EXISTS routes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id     UUID REFERENCES sos_signals(id) ON DELETE CASCADE,
  responder_id  UUID REFERENCES responders(id) ON DELETE SET NULL,
  waypoints     JSONB,
  eta_seconds   INTEGER,
  status        VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for frequent lookups
CREATE INDEX IF NOT EXISTS idx_sos_signals_status ON sos_signals(status);
CREATE INDEX IF NOT EXISTS idx_alerts_signal_id ON alerts(signal_id);
CREATE INDEX IF NOT EXISTS idx_responders_status ON responders(status);
CREATE INDEX IF NOT EXISTS idx_routes_signal_id ON routes(signal_id);
