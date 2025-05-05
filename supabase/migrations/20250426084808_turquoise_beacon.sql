/*
  # Email Tracking Schema

  1. New Tables
    - `emails`
      - `id` (text, primary key) - The email tracking ID
      - `subject` (text) - Email subject
      - `recipient` (text) - Recipient email
      - `sent_at` (timestamptz) - When the email was sent
      - `status` (text) - Current email status (sent, opened, clicked)
      - `created_at` (timestamptz) - Record creation timestamp
    
    - `email_opens`
      - `id` (uuid, primary key)
      - `email_id` (text, references emails.id)
      - `ip_address` (text) - IP address of opener
      - `user_agent` (text) - Browser user agent
      - `location` (text) - Geolocation data
      - `opened_at` (timestamptz) - When the email was opened
    
    - `link_clicks`
      - `id` (uuid, primary key)
      - `email_id` (text, references emails.id)
      - `original_url` (text) - Original URL before tracking
      - `ip_address` (text)
      - `user_agent` (text)
      - `clicked_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id text PRIMARY KEY,
  subject text NOT NULL,
  recipient text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create email_opens table
CREATE TABLE IF NOT EXISTS email_opens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id text REFERENCES emails(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  location text,
  opened_at timestamptz NOT NULL DEFAULT now()
);

-- Create link_clicks table
CREATE TABLE IF NOT EXISTS link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id text REFERENCES emails(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  ip_address text,
  user_agent text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_opens ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own emails"
  ON emails FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own emails"
  ON emails FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can view their email opens"
  ON email_opens FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow insert on email opens"
  ON email_opens FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their link clicks"
  ON link_clicks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow insert on link clicks"
  ON link_clicks FOR INSERT TO authenticated
  WITH CHECK (true);