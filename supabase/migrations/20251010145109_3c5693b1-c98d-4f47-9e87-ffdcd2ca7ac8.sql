-- Clear writing prompts again after fixing the JSON parsing issue
DELETE FROM cert_content_pool WHERE section = 'writing';