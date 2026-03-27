# Content Import Guide

This guide explains how to import the 96 pre-generated content items (48 Writing + 48 Reading) into your `cert_content_pool` database.

## What You Have

1. **Writing Content** ✅ READY
   - File: `user-uploads://writing_prompts_v1.json`
   - Format: Correct JSON structure
   - Count: 48 items (8 variations × 6 levels)

2. **Reading Content** ⚠️ NEEDS PARSING
   - File: `user-uploads://Platform_readiness_audit_1.pdf`
   - Format: PDF with passages and questions
   - Count: 48 items (8 variations × 6 levels)
   - Status: Needs to be converted to JSON format

## Import Methods

### Method 1: Direct Database Insert (Recommended)

The fastest way is to prepare a complete JSON file and use the edge function.

**Steps:**

1. **Prepare Writing JSON** (Already done ✅)
   ```json
   // Copy from user-uploads://writing_prompts_v1.json
   ```

2. **Parse Reading Content** (Manual work needed)
   - Extract all 48 reading passages from the PDF
   - Convert each to the following format:
   ```json
   {
     "section": "reading",
     "level": "A1",
     "variation": 1,
     "payload": {
       "prompt": "The reading passage text goes here...",
       "questions": [
         {
           "id": "q1",
           "text": "Question text?",
           "options": [
             { "id": "a", "text": "Option A", "isCorrect": false },
             { "id": "b", "text": "Option B", "isCorrect": true },
             { "id": "c", "text": "Option C", "isCorrect": false },
             { "id": "d", "text": "Option D", "isCorrect": false }
           ]
         },
         {
           "id": "q2",
           "text": "Second question?",
           "options": [...]
         }
       ]
     }
   }
   ```

3. **Combine Both Files**
   ```typescript
   const allContent = [...writingContent, ...readingContent];
   ```

4. **Call the Import Edge Function**
   ```typescript
   const { data, error } = await supabase.functions.invoke('import-master-content', {
     body: { items: allContent }
   });
   ```

### Method 2: Use the Admin Dashboard Button

1. Go to `/admin` page
2. Click "Import 96 Items" button
3. Follow the on-screen instructions

## Database Structure

Each item in `cert_content_pool` should have:

```typescript
{
  section: "reading" | "writing",
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  language: "english",
  version: "1.0",
  variation: 1-8,
  payload: {
    // For writing:
    prompt: string,
    wordCount: string
    
    // For reading:
    prompt: string (the passage),
    questions: Array<{
      id: string,
      text: string,
      options: Array<{
        id: string,
        text: string,
        isCorrect: boolean
      }>
    }>
  },
  used_count: 0,
  usage_context: "certification"
}
```

## Progress Tracking

After import, check the Admin dashboard:
- Total items: Should show 96 (or more if you had some already)
- Remaining: Should decrease accordingly

## Next Steps

Once you have 96 items imported:
1. Generate the remaining 96 items (Listening + Speaking) using AI
2. Total pool will be 192 items
3. Ready for production use!

## Troubleshooting

**"Already exists" errors**: The import function checks for duplicates and skips them automatically.

**Format errors**: Make sure each item follows the exact structure shown above.

**Database connection errors**: Verify your Supabase credentials are correct.
