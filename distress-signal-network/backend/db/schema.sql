-- DIST.RESS Signal Network — Database Schema
-- Disaster-recovery: run  node db/migrate.js  to recreate all tables.

-- ============================================
-- SOS Reports
-- ============================================
CREATE TABLE IF NOT EXISTS sos_reports (
  id             SERIAL PRIMARY KEY,
  lat            FLOAT NOT NULL,
  lng            FLOAT NOT NULL,
  message        TEXT NOT NULL,
  severity       INTEGER CHECK (severity IN (1, 2, 3)),
  label          VARCHAR(60),
  colour         VARCHAR(10),
  source         VARCHAR(20) NOT NULL CHECK (source IN ('manual','zero-touch','iot_node','sonic_cascade')),
  node_id        VARCHAR(20),
  resolved       BOOLEAN DEFAULT false NOT NULL,
  metadata       JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  triaged_at     TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Alerts
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id               SERIAL PRIMARY KEY,
  threat_type      VARCHAR(20) NOT NULL CHECK (threat_type IN ('earthquake','flood','blast','fire','stampede')),
  confidence       FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  lat              FLOAT NOT NULL,
  lng              FLOAT NOT NULL,
  source           VARCHAR(30) NOT NULL,
  broadcast_fired  BOOLEAN DEFAULT false NOT NULL,
  metadata         JSONB DEFAULT '{}'::jsonb NOT NULL,
  triggered_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Resources
-- ============================================
CREATE TABLE IF NOT EXISTS resources (
  id             SERIAL PRIMARY KEY,
  type           VARCHAR(20) NOT NULL CHECK (type IN ('ambulance','fire','police','shelter','depot')),
  name           VARCHAR(100),
  lat            FLOAT NOT NULL,
  lng            FLOAT NOT NULL,
  resource_type  VARCHAR(20) DEFAULT 'ambulance',
  available      BOOLEAN DEFAULT true NOT NULL,
  last_updated   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
