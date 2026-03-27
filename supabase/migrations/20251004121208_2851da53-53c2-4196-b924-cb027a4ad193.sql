-- Add variation field to cert_content_pool
ALTER TABLE public.cert_content_pool 
ADD COLUMN IF NOT EXISTS variation INTEGER DEFAULT 1;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_cert_content_pool_lookup 
ON public.cert_content_pool(section, level, language, version, variation);

-- Update the unique constraint to include variation
DROP INDEX IF EXISTS cert_content_pool_section_level_language_version_key;
CREATE UNIQUE INDEX cert_content_pool_unique_item 
ON public.cert_content_pool(section, level, language, version, variation);