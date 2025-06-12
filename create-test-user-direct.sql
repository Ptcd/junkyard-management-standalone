-- Create a test user directly in the database (bypasses email)
-- Run this in your Supabase SQL editor

-- Insert directly into auth.users (bypassing signup flow)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Test", "last_name": "User", "role": "admin"}'
);

-- The trigger will automatically create the user_profile record 