-- Monica AI business tables.
-- Execute after database/create.sql has created schema monica_ai and base tables.

CREATE TABLE IF NOT EXISTS monica_ai.themes (
    id                BIGSERIAL PRIMARY KEY,
    theme_id          UUID         NOT NULL DEFAULT gen_random_uuid(),
    title             VARCHAR(255) NOT NULL,
    brief             TEXT,
    description       TEXT,
    status            VARCHAR(50)  NOT NULL DEFAULT 'draft',
    publish_date      DATE,
    cover_image_url   TEXT,
    prompt_texts      TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    tags              JSONB,
    stats             JSONB,
    source_type       VARCHAR(50),
    sort_order        INTEGER      NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    deleted           INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT themes_theme_id_key UNIQUE (theme_id),
    CONSTRAINT themes_deleted_check CHECK (deleted = ANY (ARRAY[0, 1]))
);

CREATE INDEX IF NOT EXISTS idx_themes_status_publish_date ON monica_ai.themes (status, publish_date);
CREATE INDEX IF NOT EXISTS idx_themes_publish_date ON monica_ai.themes (publish_date);

CREATE TABLE IF NOT EXISTS monica_ai.theme_submissions (
    id                   BIGSERIAL PRIMARY KEY,
    theme_submission_id  UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id              UUID         NOT NULL,
    status               VARCHAR(50)  NOT NULL DEFAULT 'draft',
    raw_title            VARCHAR(255) NOT NULL,
    raw_description      TEXT,
    trigger_type         VARCHAR(100),
    edited_title         VARCHAR(255),
    edited_brief         TEXT,
    edited_description   TEXT,
    accepted_theme_id    UUID,
    reviewed_by_user_id  UUID,
    review_reason        TEXT,
    source_type          VARCHAR(50)  NOT NULL DEFAULT 'user',
    submitted_at         TIMESTAMPTZ,
    reviewed_at          TIMESTAMPTZ,
    selected_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    deleted              INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT theme_submissions_theme_submission_id_key UNIQUE (theme_submission_id),
    CONSTRAINT theme_submissions_deleted_check CHECK (deleted = ANY (ARRAY[0, 1]))
);

CREATE INDEX IF NOT EXISTS idx_theme_submissions_user_submitted_at ON monica_ai.theme_submissions (user_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_theme_submissions_status_submitted_at ON monica_ai.theme_submissions (status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_theme_submissions_accepted_theme_id ON monica_ai.theme_submissions (accepted_theme_id);

CREATE TABLE IF NOT EXISTS monica_ai.reference_images (
    id              BIGSERIAL PRIMARY KEY,
    reference_id    UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID,
    storage_key     TEXT        NOT NULL,
    url             TEXT,
    mime_type       VARCHAR(100),
    width           INTEGER,
    height          INTEGER,
    status          VARCHAR(50) NOT NULL DEFAULT 'uploaded',
    safety_status   VARCHAR(50) NOT NULL DEFAULT 'pending',
    safety_result   JSONB,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted         INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT reference_images_reference_id_key UNIQUE (reference_id),
    CONSTRAINT reference_images_deleted_check CHECK (deleted = ANY (ARRAY[0, 1]))
);

CREATE INDEX IF NOT EXISTS idx_reference_images_user_created_at ON monica_ai.reference_images (user_id, created_at);

CREATE TABLE IF NOT EXISTS monica_ai.generation_jobs (
    id                 BIGSERIAL PRIMARY KEY,
    job_id             UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id            UUID         NOT NULL,
    theme_id           UUID,
    reference_id       UUID,
    source_image_id    UUID,
    status             VARCHAR(50)  NOT NULL DEFAULT 'pending',
    source_page        VARCHAR(50),
    generation_type    VARCHAR(50)  NOT NULL DEFAULT 'text_to_image',
    prompt             TEXT         NOT NULL,
    negative_prompt    TEXT,
    edit_instruction   TEXT,
    model              VARCHAR(100) NOT NULL,
    style              VARCHAR(100),
    ratio              VARCHAR(50),
    image_count        INTEGER      NOT NULL DEFAULT 1,
    estimated_credits  INTEGER      NOT NULL DEFAULT 0,
    charged_credits    INTEGER      NOT NULL DEFAULT 0,
    provider           VARCHAR(100),
    provider_job_id    VARCHAR(255),
    failure_code       VARCHAR(100),
    failure_message    TEXT,
    qstash_message_id  VARCHAR(255),
    retry_count        INTEGER      NOT NULL DEFAULT 0,
    locked_at          TIMESTAMPTZ,
    locked_by          VARCHAR(255),
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    deleted            INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT generation_jobs_job_id_key UNIQUE (job_id),
    CONSTRAINT generation_jobs_deleted_check CHECK (deleted = ANY (ARRAY[0, 1]))
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_created_at ON monica_ai.generation_jobs (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status_created_at ON monica_ai.generation_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_theme_id ON monica_ai.generation_jobs (theme_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_source_image_id ON monica_ai.generation_jobs (source_image_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_provider_job_id ON monica_ai.generation_jobs (provider_job_id);

CREATE TABLE IF NOT EXISTS monica_ai.generated_images (
    id                    BIGSERIAL PRIMARY KEY,
    image_id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    job_id                UUID,
    provider_image_index  INTEGER,
    user_id               UUID        NOT NULL,
    theme_id              UUID,
    status                VARCHAR(50) NOT NULL DEFAULT 'generated',
    storage_key           TEXT        NOT NULL,
    image_url             TEXT,
    thumbnail_url         TEXT,
    width                 INTEGER,
    height                INTEGER,
    prompt_used           TEXT,
    model                 VARCHAR(100),
    style                 VARCHAR(100),
    ratio                 VARCHAR(50),
    safety_status         VARCHAR(50) NOT NULL DEFAULT 'pending',
    safety_result         JSONB,
    metadata              JSONB,
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted               INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT generated_images_image_id_key UNIQUE (image_id),
    CONSTRAINT generated_images_job_provider_index_key UNIQUE (job_id, provider_image_index),
    CONSTRAINT generated_images_deleted_check CHECK (deleted = ANY (ARRAY[0, 1]))
);

CREATE INDEX IF NOT EXISTS idx_generated_images_user_created_at ON monica_ai.generated_images (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_generated_images_theme_id ON monica_ai.generated_images (theme_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_status_created_at ON monica_ai.generated_images (status, created_at);

CREATE TABLE IF NOT EXISTS monica_ai.image_submissions (
    id                BIGSERIAL PRIMARY KEY,
    submission_id     UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL,
    image_id          UUID        NOT NULL,
    theme_id          UUID        NOT NULL,
    status            VARCHAR(50) NOT NULL DEFAULT 'under_review',
    prompt_snapshot   TEXT,
    creator_note      TEXT,
    safety_status     VARCHAR(50) NOT NULL DEFAULT 'pending',
    relevance_status  VARCHAR(50) NOT NULL DEFAULT 'pending',
    review_summary    TEXT,
    submitted_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reviewed_at       TIMESTAMPTZ,
    published_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted           INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT image_submissions_submission_id_key UNIQUE (submission_id),
    CONSTRAINT image_submissions_deleted_check CHECK (deleted = ANY (ARRAY[0, 1]))
);

CREATE INDEX IF NOT EXISTS idx_image_submissions_user_submitted_at ON monica_ai.image_submissions (user_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_image_submissions_theme_status ON monica_ai.image_submissions (theme_id, status);
CREATE INDEX IF NOT EXISTS idx_image_submissions_image_id ON monica_ai.image_submissions (image_id);

CREATE TABLE IF NOT EXISTS monica_ai.review_records (
    id                BIGSERIAL PRIMARY KEY,
    review_id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    submission_id     UUID,
    target_type       VARCHAR(50) NOT NULL,
    target_id         UUID        NOT NULL,
    reviewer_user_id  UUID,
    review_type       VARCHAR(50) NOT NULL,
    result            VARCHAR(50) NOT NULL,
    reason            TEXT,
    detail            JSONB,
    created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted           INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT review_records_review_id_key UNIQUE (review_id),
    CONSTRAINT review_records_deleted_check CHECK (deleted = ANY (ARRAY[0, 1]))
);

CREATE INDEX IF NOT EXISTS idx_review_records_target ON monica_ai.review_records (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_review_records_submission_id ON monica_ai.review_records (submission_id);

CREATE TABLE IF NOT EXISTS monica_ai.public_images (
    id               BIGSERIAL PRIMARY KEY,
    public_image_id  UUID        NOT NULL DEFAULT gen_random_uuid(),
    image_id         UUID        NOT NULL,
    submission_id    UUID,
    user_id          UUID        NOT NULL,
    theme_id         UUID,
    status           VARCHAR(50) NOT NULL DEFAULT 'published',
    title            VARCHAR(255),
    prompt_public    BOOLEAN     NOT NULL DEFAULT TRUE,
    tags             JSONB,
    like_count       INTEGER     NOT NULL DEFAULT 0,
    save_count       INTEGER     NOT NULL DEFAULT 0,
    view_count       INTEGER     NOT NULL DEFAULT 0,
    featured_score   INTEGER     NOT NULL DEFAULT 0,
    published_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted          INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT public_images_public_image_id_key UNIQUE (public_image_id),
    CONSTRAINT public_images_image_id_key UNIQUE (image_id),
    CONSTRAINT public_images_submission_id_key UNIQUE (submission_id),
    CONSTRAINT public_images_deleted_check CHECK (deleted = ANY (ARRAY[0, 1]))
);

CREATE INDEX IF NOT EXISTS idx_public_images_status_published_at ON monica_ai.public_images (status, published_at);
CREATE INDEX IF NOT EXISTS idx_public_images_theme_featured_score ON monica_ai.public_images (theme_id, featured_score);
CREATE INDEX IF NOT EXISTS idx_public_images_like_count ON monica_ai.public_images (like_count);

CREATE TABLE IF NOT EXISTS monica_ai.image_likes (
    id               BIGSERIAL PRIMARY KEY,
    public_image_id  UUID        NOT NULL,
    user_id          UUID        NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted          INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT image_likes_public_image_user_key UNIQUE (public_image_id, user_id),
    CONSTRAINT image_likes_deleted_check CHECK (deleted = ANY (ARRAY[0, 1]))
);

CREATE INDEX IF NOT EXISTS idx_image_likes_user_created_at ON monica_ai.image_likes (user_id, created_at);

CREATE TABLE IF NOT EXISTS monica_ai.image_saves (
    id               BIGSERIAL PRIMARY KEY,
    public_image_id  UUID        NOT NULL,
    user_id          UUID        NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted          INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT image_saves_public_image_user_key UNIQUE (public_image_id, user_id),
    CONSTRAINT image_saves_deleted_check CHECK (deleted = ANY (ARRAY[0, 1]))
);

CREATE INDEX IF NOT EXISTS idx_image_saves_user_created_at ON monica_ai.image_saves (user_id, created_at);

-- Re-grant explicit privileges after table rebuild.
-- Notes:
-- 1. Tables recreated via DROP/CREATE are new objects and will not inherit prior grants.
-- 2. Table creation uses various privileged accounts; default owner privileges are unreliable.
-- Append privilege statements to guarantee monica_ai_app persistent access to objects in schema monica_ai.
GRANT USAGE ON SCHEMA monica_ai TO monica_ai_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA monica_ai TO monica_ai_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA monica_ai TO monica_ai_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA monica_ai TO monica_ai_app;
