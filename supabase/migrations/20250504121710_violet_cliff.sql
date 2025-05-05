/*
  # Handle Duplicate Emails

  1. Changes
    - Remove duplicate emails while preserving the most recent entry
    - Add unique constraints after cleaning data
    
  2. Security
    - Maintains existing security model
    - No changes to RLS policies
*/

-- Create a temporary table to store unique emails
CREATE TEMP TABLE unique_emails AS
SELECT DISTINCT ON (subject, recipient, sent_at) *
FROM emails
ORDER BY subject, recipient, sent_at, created_at DESC;

-- Delete all rows from emails
TRUNCATE emails;

-- Insert unique rows back into emails
INSERT INTO emails
SELECT * FROM unique_emails;

-- Drop temporary table
DROP TABLE unique_emails;

-- Add unique constraint on id column (if not already present)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'emails_id_key'
  ) THEN
    ALTER TABLE emails ADD CONSTRAINT emails_id_key UNIQUE (id);
  END IF;
END $$;

-- Add unique constraint on subject, recipient, and sent_at combination
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'emails_subject_recipient_sent_at_key'
  ) THEN
    ALTER TABLE emails ADD CONSTRAINT emails_subject_recipient_sent_at_key 
      UNIQUE (subject, recipient, sent_at);
  END IF;
END $$;