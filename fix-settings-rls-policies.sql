-- Fix Settings RLS Policies
-- Run this in your Supabase SQL Editor to fix the settings sync issue

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Admins can update settings for their yard" ON yard_settings;
DROP POLICY IF EXISTS "Admins can insert settings for their yard" ON yard_settings;

-- Create new policies that allow all users to manage settings for their yard
CREATE POLICY "Users can update settings for their yard" ON yard_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = yard_settings.yard_id
        )
    );

CREATE POLICY "Users can insert settings for their yard" ON yard_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = yard_settings.yard_id
        )
    );

CREATE POLICY "Users can delete settings for their yard" ON yard_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin' AND yard_id = yard_settings.yard_id
        )
    );

-- Test the policies by checking current user permissions
SELECT 
    'Current user can access yard_settings: ' || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid()
        ) THEN 'YES'
        ELSE 'NO'
    END as permission_check; 