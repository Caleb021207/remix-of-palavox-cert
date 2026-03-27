-- Add parent_id column to track translation sources
-- This links translated content back to its English source

ALTER TABLE cert_content_pool 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES cert_content_pool(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cert_content_pool_parent ON cert_content_pool(parent_id);

-- Add comment for documentation
COMMENT ON COLUMN cert_content_pool.parent_id IS 'Links translated content to its English source pool item';