-- Monica original flow schema update.
-- Execute on the Supabase test database after the existing Monica AI schema is present.

ALTER TABLE monica_ai.generation_jobs
  ADD COLUMN IF NOT EXISTS source_page VARCHAR(50);

ALTER TABLE monica_ai.themes
  ADD COLUMN IF NOT EXISTS issue_number INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS uq_themes_issue_number
  ON monica_ai.themes (issue_number);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'monica_ai'
      AND table_name = 'themes'
      AND column_name = 'generator_ideas'
      AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE monica_ai.themes ADD COLUMN IF NOT EXISTS generator_ideas_json JSONB NOT NULL DEFAULT '[]'::JSONB;

    UPDATE monica_ai.themes
    SET generator_ideas_json = COALESCE(
      (
        SELECT JSONB_AGG(JSONB_BUILD_OBJECT('idea', idea_text, 'prompt', idea_text))
        FROM UNNEST(generator_ideas) AS idea_text
        WHERE BTRIM(idea_text) <> ''
      ),
      '[]'::JSONB
    );

    ALTER TABLE monica_ai.themes DROP COLUMN generator_ideas;
    ALTER TABLE monica_ai.themes RENAME COLUMN generator_ideas_json TO generator_ideas;
  ELSE
    ALTER TABLE monica_ai.themes ADD COLUMN IF NOT EXISTS generator_ideas JSONB NOT NULL DEFAULT '[]'::JSONB;
  END IF;
END $$;

ALTER TABLE monica_ai.public_images
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) NOT NULL DEFAULT 'user_submission',
  ADD COLUMN IF NOT EXISTS created_by UUID;

UPDATE monica_ai.public_images
SET source_type = 'user_submission'
WHERE source_type IS NULL OR BTRIM(source_type) = '';

CREATE TABLE IF NOT EXISTS monica_ai.assistant_interactions (
    id                    BIGSERIAL PRIMARY KEY,
    interaction_id        UUID        NOT NULL DEFAULT gen_random_uuid(),
    session_id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id               UUID,
    root_action_type      VARCHAR(50) NOT NULL,
    action_type           VARCHAR(50) NOT NULL,
    parent_interaction_id UUID,
    source_page           VARCHAR(50),
    theme_id              BIGINT,
    image_id              UUID,
    public_image_id       UUID,
    generation_job_id     UUID,
    user_input            TEXT,
    input_prompt          TEXT,
    output_prompt         TEXT,
    ideas                 JSONB,
    selected_idea_index   INTEGER,
    selected_idea         JSONB,
    request_payload       JSONB,
    response_payload      JSONB,
    provider              VARCHAR(100),
    model                 VARCHAR(100),
    status                VARCHAR(50) NOT NULL DEFAULT 'succeeded',
    error_message         TEXT,
    used_for_generation   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT assistant_interactions_interaction_id_key UNIQUE (interaction_id)
);

CREATE INDEX IF NOT EXISTS idx_assistant_interactions_session_created_at
  ON monica_ai.assistant_interactions (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assistant_interactions_user_created_at
  ON monica_ai.assistant_interactions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assistant_interactions_theme_created_at
  ON monica_ai.assistant_interactions (theme_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assistant_interactions_action_created_at
  ON monica_ai.assistant_interactions (root_action_type, action_type, created_at);

CREATE TABLE IF NOT EXISTS monica_ai.theme_featured_images (
    id              BIGSERIAL PRIMARY KEY,
    theme_id        BIGINT      NOT NULL,
    public_image_id BIGINT      NOT NULL,
    position        INTEGER     NOT NULL DEFAULT 0,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted         INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT theme_featured_images_deleted_check CHECK (deleted = ANY (ARRAY[0, 1])),
    CONSTRAINT theme_featured_images_theme_position_key UNIQUE (theme_id, position),
    CONSTRAINT theme_featured_images_theme_public_key UNIQUE (theme_id, public_image_id)
);

CREATE INDEX IF NOT EXISTS idx_theme_featured_images_theme_position
  ON monica_ai.theme_featured_images (theme_id, position);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'monica_ai'
      AND table_name = 'themes'
      AND column_name = 'featured_image_ids'
  ) THEN
    INSERT INTO monica_ai.theme_featured_images (theme_id, public_image_id, position)
    SELECT theme_id, public_image_id, position
    FROM (
      SELECT
        t.id AS theme_id,
        image_id AS public_image_id,
        ordinality::INTEGER AS position
      FROM monica_ai.themes t
      CROSS JOIN LATERAL UNNEST(t.featured_image_ids) WITH ORDINALITY AS featured(image_id, ordinality)
      WHERE COALESCE(ARRAY_LENGTH(t.featured_image_ids, 1), 0) > 0
    ) legacy_featured
    ON CONFLICT (theme_id, public_image_id) DO NOTHING;
  END IF;
END $$;

ALTER TABLE monica_ai.themes
  DROP COLUMN IF EXISTS featured_image_ids;

GRANT SELECT, INSERT, UPDATE, DELETE ON monica_ai.assistant_interactions TO monica_ai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON monica_ai.theme_featured_images TO monica_ai_app;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE monica_ai.assistant_interactions_id_seq TO monica_ai_app;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE monica_ai.theme_featured_images_id_seq TO monica_ai_app;
