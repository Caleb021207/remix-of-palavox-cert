-- Clear old writing prompts from cache to allow regeneration with bilingual format
DELETE FROM cert_content_pool WHERE section = 'writing';