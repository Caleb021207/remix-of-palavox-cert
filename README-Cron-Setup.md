# Daily Content Pool Prewarm - Cron Job Setup

This guide explains how to set up an automatic daily cron job to maintain the ESL content pool.

## Prerequisites

1. Enable the required PostgreSQL extensions in your Supabase project:
   - Go to **Supabase Dashboard** → **Database** → **Extensions**
   - Enable `pg_cron` (Scheduled jobs)
   - Enable `pg_net` (HTTP requests from database)

## Setup the Cron Job

After enabling the extensions, run this SQL in the **SQL Editor**:

```sql
-- Create daily prewarm job at 3:00 AM UTC
SELECT cron.schedule(
  'daily-content-prewarm',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jyvmhtterlpszklhgjwp.supabase.co/functions/v1/start-prewarm',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dm1odHRlcmxwc3prbGhnandwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Mzg3NDYsImV4cCI6MjA2MjQxNDc0Nn0.kDkcgjQ321V3Mi0CzvwUrKdIvClt51lQeKPDTCnj24E'
    ),
    body := '{"targetItems": 60, "batchSize": 50}'::jsonb
  ) AS request_id;
  $$
);
```

## Verify the Cron Job

Check that the job was created:

```sql
SELECT * FROM cron.job;
```

## Monitor Job Executions

View recent job runs:

```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

## Modify the Schedule

To change the schedule (e.g., run every 6 hours):

```sql
-- Remove existing job
SELECT cron.unschedule('daily-content-prewarm');

-- Create new schedule (every 6 hours)
SELECT cron.schedule(
  'content-prewarm-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jyvmhtterlpszklhgjwp.supabase.co/functions/v1/start-prewarm',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dm1odHRlcmxwc3prbGhnandwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Mzg3NDYsImV4cCI6MjA2MjQxNDc0Nn0.kDkcgjQ321V3Mi0CzvwUrKdIvClt51lQeKPDTCnj24E'
    ),
    body := '{"targetItems": 60, "batchSize": 30}'::jsonb
  ) AS request_id;
  $$
);
```

## Cron Expression Reference

| Expression | Description |
|------------|-------------|
| `0 3 * * *` | Daily at 3:00 AM UTC |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 0` | Weekly on Sunday at midnight |
| `*/30 * * * *` | Every 30 minutes |

## Remove the Cron Job

To completely remove the scheduled job:

```sql
SELECT cron.unschedule('daily-content-prewarm');
```

## Expected Results

Each cron execution will:
- Generate 30-50 new content items
- Prioritize sections/levels with the least content
- Cost approximately $0.06-0.10 per run (GPT-4o-mini pricing)
- Log results in the `prewarm_jobs` table

## Troubleshooting

If jobs aren't running:
1. Check that both `pg_cron` and `pg_net` extensions are enabled
2. Verify the cron job exists: `SELECT * FROM cron.job;`
3. Check job run history: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;`
4. Check edge function logs in Supabase Dashboard → Edge Functions → start-prewarm → Logs
