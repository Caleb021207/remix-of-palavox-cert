-- ============================================
-- Migration: Add Rubric & Adaptive Tracking
-- Date: 2025-10-12
-- ============================================

-- 1. Add route_trace column to test_sessions for adaptive routing
ALTER TABLE test_sessions 
ADD COLUMN IF NOT EXISTS route_trace JSONB DEFAULT NULL;

COMMENT ON COLUMN test_sessions.route_trace IS 
'Adaptive routing path per modality. Example: {"reading": {"path": ["B1", "B2"], "peakLevel": "B2"}, "listening": {"path": ["B1", "A2"], "peakLevel": "B1"}}';

-- 2. Add phase_weights column for audit trail
ALTER TABLE test_sessions 
ADD COLUMN IF NOT EXISTS phase_weights JSONB DEFAULT NULL;

COMMENT ON COLUMN test_sessions.phase_weights IS 
'Phase weights used in final score calculation: {"comprehension": 0.25, "writing": 0.30, "conversation": 0.45}';

-- 3. Create rubric_scores table for detailed trait analysis
CREATE TABLE IF NOT EXISTS rubric_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('writing', 'conversation')),
  
  -- Trait scores (0-5 scale)
  traits JSONB NOT NULL,
  -- Example: {"taskFulfillment": 3, "range": 4, "accuracy": 3, "cohesion": 4}
  
  -- Short notes per trait
  notes JSONB,
  -- Example: {"taskFulfillment": "Addresses prompt adequately", "range": "Good variety of structures"}
  
  -- Validator results
  validator_result JSONB,
  -- Example: {"language": "en", "wordCount": 142, "flags": {"offtopic": false, "wrongLanguage": false}}
  
  -- Scoring metadata
  recommended_cefr TEXT,
  length_adjustment INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rubric_scores_session ON rubric_scores(test_session_id);
CREATE INDEX IF NOT EXISTS idx_rubric_scores_phase ON rubric_scores(phase);

-- RLS Policies
ALTER TABLE rubric_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rubric scores"
ON rubric_scores FOR SELECT
USING (
  test_session_id IN (
    SELECT id FROM test_sessions 
    WHERE user_id = auth.uid() OR auth.uid() IS NULL
  )
);

CREATE POLICY "Service can manage rubric scores"
ON rubric_scores FOR ALL
USING (true);

-- 4. Add CEFR tag requirement to cert_content_pool
COMMENT ON COLUMN cert_content_pool.payload IS 
'Must include cefrLevel field for reading/listening items. Example: {"passage": "...", "questions": [...], "cefrLevel": "B2"}';

-- 5. Backfill phase_weights for existing sessions (optional)
UPDATE test_sessions 
SET phase_weights = '{"comprehension": 0.33, "writing": 0.33, "conversation": 0.34}'::jsonb
WHERE phase_weights IS NULL 
  AND score IS NOT NULL
  AND created_at < NOW();

COMMENT ON COLUMN test_sessions.phase_weights IS 
'Old sessions used equal weights (0.33/0.33/0.34). New sessions use (0.25/0.30/0.45).';