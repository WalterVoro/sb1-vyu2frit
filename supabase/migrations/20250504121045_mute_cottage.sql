/*
  # Add Unique Constraints to Emails Table

  1. Changes
    - Add unique constraint on emails.id column
    - Add unique constraint on (subject, recipient, sent_at) combination
    - These constraints will prevent duplicate email entries

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

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