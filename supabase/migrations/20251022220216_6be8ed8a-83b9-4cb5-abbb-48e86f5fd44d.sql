-- Drop the old constraint
ALTER TABLE test_sessions DROP CONSTRAINT IF EXISTS test_sessions_test_type_check;

-- Add the updated constraint with 'certification' included
ALTER TABLE test_sessions ADD CONSTRAINT test_sessions_test_type_check 
  CHECK (test_type = ANY (ARRAY['speaking'::text, 'multipleChoice'::text, 'writing'::text, 'certification'::text]));