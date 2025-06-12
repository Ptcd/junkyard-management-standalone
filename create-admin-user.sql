-- Simple Admin User Creation for Testing
-- Run this in your Supabase SQL Editor

-- Option 1: Create admin user profile after signing up normally
-- 1. First, sign up normally on your website with email: admin@test.com and password: AdminPass123
-- 2. Then run this SQL to make that user an admin:

UPDATE user_profiles 
SET 
  role = 'admin',
  first_name = 'Admin',
  last_name = 'User',
  phone = '(555) 123-4567',
  status = 'active'
WHERE email = 'admin@test.com';

-- Option 2: If you want to create a user profile directly (easier approach)
-- Just insert the profile, then you can sign up with this email later
INSERT INTO user_profiles (
  id,
  email,
  username,
  role,
  yard_id,
  first_name,
  last_name,
  phone,
  license_number,
  hire_date,
  status,
  created_at
) VALUES (
  gen_random_uuid(),
  'admin@test.com',
  'admin@test.com',
  'admin',
  'yard001',
  'Admin',
  'User',
  '(555) 123-4567',
  NULL,
  CURRENT_DATE,
  'active',
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  status = 'active';

-- Verify the admin user
SELECT 
  id,
  email,
  username,
  role,
  first_name,
  last_name,
  status,
  yard_id
FROM user_profiles 
WHERE email = 'admin@test.com';

-- Test credentials for your app:
-- Email: admin@test.com
-- Password: AdminPass123 (you'll set this when you sign up) 