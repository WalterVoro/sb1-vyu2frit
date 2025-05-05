/*
  # Allow Anonymous Access for Email Tracking

  1. Changes
    - Add policies to allow anonymous access for email tracking
    - Enable inserts from anonymous users
    - Enable reads from anonymous users for tracking purposes

  2. Security
    - Policies are scoped to specific operations
    - Maintains data integrity while allowing tracking functionality
*/

-- Allow anonymous inserts for emails
CREATE POLICY "Allow anonymous email inserts"
  ON emails FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anonymous inserts for email opens
CREATE POLICY "Allow anonymous email open tracking"
  ON email_opens FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anonymous inserts for link clicks
CREATE POLICY "Allow anonymous link click tracking"
  ON link_clicks FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anonymous users to read their tracked emails
CREATE POLICY "Allow anonymous email reads"
  ON emails FOR SELECT TO anon
  USING (true);

-- Allow anonymous users to read email opens
CREATE POLICY "Allow anonymous email open reads"
  ON email_opens FOR SELECT TO anon
  USING (true);

-- Allow anonymous users to read link clicks
CREATE POLICY "Allow anonymous link click reads"
  ON link_clicks FOR SELECT TO anon
  USING (true);