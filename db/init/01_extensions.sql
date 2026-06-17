-- Runs once on first container start (empty data dir).
-- Enables pgvector so embedding columns are available to the app.
CREATE EXTENSION IF NOT EXISTS vector;
