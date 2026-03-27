-- Drop the constraint first, then the index
ALTER TABLE cert_content_pool DROP CONSTRAINT IF EXISTS cert_content_pool_section_level_language_version_usage_cont_key;