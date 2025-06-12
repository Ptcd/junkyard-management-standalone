-- Temporarily disable email confirmation for development
-- Run this in your Supabase SQL editor

-- This allows users to sign up without email confirmation
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- To re-enable email confirmation later, you can set it back in Supabase dashboard:
-- Authentication > Settings > Email Confirmation = Enabled 