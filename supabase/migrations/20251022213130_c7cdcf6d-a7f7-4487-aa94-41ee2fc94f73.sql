-- Remove old certification pass/fail columns
ALTER TABLE test_sessions DROP COLUMN IF EXISTS phase_pass_status;
ALTER TABLE test_sessions DROP COLUMN IF EXISTS certification_status;

-- Add certificate tier tracking
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS certificate_tier TEXT CHECK (certificate_tier IN ('none', 'functional', 'professional'));

-- Add index for faster certificate queries
CREATE INDEX IF NOT EXISTS idx_test_sessions_certificate_tier ON test_sessions(certificate_tier) WHERE certificate_tier IS NOT NULL;