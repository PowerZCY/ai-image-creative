-- Monica AI generation job reference images.
-- Supports up to 4 reference images per generation job.
-- Execute after database/create-monica-ai.sql and database/update-monica-ai-schema-for-original-flow.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS monica_ai.generation_job_reference_images (
    id            BIGSERIAL PRIMARY KEY,
    job_id        UUID        NOT NULL,
    reference_id  UUID        NOT NULL,
    position      INTEGER     NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT generation_job_reference_images_job_position_key UNIQUE (job_id, position),
    CONSTRAINT generation_job_reference_images_job_reference_key UNIQUE (job_id, reference_id),
    CONSTRAINT generation_job_reference_images_position_check CHECK (position >= 0 AND position < 4)
);

CREATE INDEX IF NOT EXISTS idx_generation_job_reference_images_job_position
  ON monica_ai.generation_job_reference_images (job_id, position);

CREATE INDEX IF NOT EXISTS idx_generation_job_reference_images_reference_id
  ON monica_ai.generation_job_reference_images (reference_id);

ALTER TABLE monica_ai.generation_jobs
  DROP COLUMN IF EXISTS reference_id;

GRANT USAGE ON SCHEMA monica_ai TO monica_ai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA monica_ai TO monica_ai_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA monica_ai TO monica_ai_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA monica_ai TO monica_ai_app;

COMMIT;
