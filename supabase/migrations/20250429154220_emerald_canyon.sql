/*
  # Add Stored Procedures for Email Tracking

  1. New Procedures
    - `record_email_open`
      - Records email open event
      - Updates email status atomically
      - Prevents duplicate opens within time window
    
    - `record_link_click`
      - Records link click event
      - Updates email status atomically
      - Prevents duplicate clicks within time window

  2. Changes
    - Add functions to handle atomic operations
    - Add timestamp checks to prevent duplicates
    - Add transaction handling
*/

-- Function to record email opens
CREATE OR REPLACE FUNCTION record_email_open(
  p_email_id text,
  p_ip_address text,
  p_user_agent text
) RETURNS void AS $$
DECLARE
  v_last_open timestamptz;
BEGIN
  -- Check for recent opens from same IP (1 minute window)
  SELECT opened_at INTO v_last_open
  FROM email_opens
  WHERE email_id = p_email_id 
    AND ip_address = p_ip_address
    AND opened_at > NOW() - INTERVAL '1 minute'
  ORDER BY opened_at DESC
  LIMIT 1;

  -- Only proceed if no recent opens
  IF v_last_open IS NULL THEN
    -- Record open
    INSERT INTO email_opens (
      email_id,
      ip_address,
      user_agent
    ) VALUES (
      p_email_id,
      p_ip_address,
      p_user_agent
    );

    -- Update email status
    UPDATE emails 
    SET status = 'opened'
    WHERE id = p_email_id
      AND status = 'sent';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to record link clicks
CREATE OR REPLACE FUNCTION record_link_click(
  p_email_id text,
  p_original_url text,
  p_ip_address text,
  p_user_agent text
) RETURNS void AS $$
DECLARE
  v_last_click timestamptz;
BEGIN
  -- Check for recent clicks from same IP (1 minute window)
  SELECT clicked_at INTO v_last_click
  FROM link_clicks
  WHERE email_id = p_email_id 
    AND ip_address = p_ip_address
    AND original_url = p_original_url
    AND clicked_at > NOW() - INTERVAL '1 minute'
  ORDER BY clicked_at DESC
  LIMIT 1;

  -- Only proceed if no recent clicks
  IF v_last_click IS NULL THEN
    -- Record click
    INSERT INTO link_clicks (
      email_id,
      original_url,
      ip_address,
      user_agent
    ) VALUES (
      p_email_id,
      p_original_url,
      p_ip_address,
      p_user_agent
    );

    -- Update email status
    UPDATE emails 
    SET status = 'clicked'
    WHERE id = p_email_id;
  END IF;
END;
$$ LANGUAGE plpgsql;