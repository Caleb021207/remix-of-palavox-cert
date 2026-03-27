-- Add topic_hash and user_id columns to cert_item_usage for cross-session tracking
ALTER TABLE cert_item_usage 
ADD COLUMN IF NOT EXISTS topic_hash TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cert_item_usage_user_topic 
ON cert_item_usage(user_id, topic_hash);

CREATE INDEX IF NOT EXISTS idx_cert_item_usage_user_section
ON cert_item_usage(user_id, section);

-- Function to get recently used topic hashes for a user
CREATE OR REPLACE FUNCTION get_recent_topic_hashes(
  p_user_id UUID,
  p_section TEXT,
  p_lookback_days INTEGER DEFAULT 30
) RETURNS TEXT[] 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN ARRAY(
    SELECT DISTINCT topic_hash
    FROM cert_item_usage
    WHERE user_id = p_user_id
      AND section = p_section
      AND used_at > NOW() - INTERVAL '1 day' * p_lookback_days
      AND topic_hash IS NOT NULL
    ORDER BY topic_hash
  );
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_recent_topic_hashes IS 'Returns list of topic hashes used by a user in the specified section within the lookback period, for preventing topic repetition across test sessions';

-- Add comment on columns
COMMENT ON COLUMN cert_item_usage.topic_hash IS 'Hash of level-section-topic for cross-session deduplication';
COMMENT ON COLUMN cert_item_usage.user_id IS 'User who used this content item, for cross-session topic tracking';