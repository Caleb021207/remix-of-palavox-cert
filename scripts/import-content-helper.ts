/**
 * Content Import Helper
 * 
 * This script helps you import Writing and Reading content into cert_content_pool.
 * 
 * STEPS:
 * 1. Copy the writing_prompts_v1.json content below
 * 2. Parse the Reading content from the PDF and add it below
 * 3. Run the import via the edge function
 */

import { supabase } from '@/integrations/supabase/client';

// Writing content from writing_prompts_v1.json (48 items)
const writingContent = [
  // Copy all items from user-uploads://writing_prompts_v1.json here
  // They should already have the correct format:
  // { section: "writing", level: "A1", variation: 1, payload: {...} }
];

// Reading content parsed from PDF (48 items)
const readingContent = [
  // Add all 48 reading items here following this format:
  // {
  //   section: "reading",
  //   level: "A1",
  //   variation: 1,
  //   payload: {
  //     prompt: "The reading passage text...",
  //     questions: [
  //       {
  //         id: "q1",
  //         text: "Question text?",
  //         options: [
  //           { id: "a", text: "Option A", isCorrect: false },
  //           { id: "b", text: "Option B", isCorrect: true },
  //           { id: "c", text: "Option C", isCorrect: false },
  //           { id: "d", text: "Option D", isCorrect: false }
  //         ]
  //       }
  //     ]
  //   }
  // }
];

/**
 * Import content using the edge function
 */
export async function importContent() {
  const allContent = [...writingContent, ...readingContent];
  
  console.log(`Importing ${allContent.length} items...`);
  console.log(`- Writing: ${writingContent.length} items`);
  console.log(`- Reading: ${readingContent.length} items`);
  
  const { data, error } = await supabase.functions.invoke('import-master-content', {
    body: { items: allContent }
  });
  
  if (error) {
    console.error('Import failed:', error);
    throw error;
  }
  
  console.log('Import complete:', data);
  return data;
}

/**
 * Example usage in browser console:
 * 
 * import { importContent } from './scripts/import-content-helper';
 * await importContent();
 */
