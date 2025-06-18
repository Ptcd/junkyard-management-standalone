-- User Deletion Fix for Supabase
-- Run this SQL in your Supabase SQL Editor to fix user deletion issues

-- First, add missing DELETE policies if they don't exist
-- (These should be added to your main schema file as well)

-- Drop existing DELETE policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can delete their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete transactions from their yard" ON vehicle_transactions;

-- Add missing DELETE policies for user_profiles
CREATE POLICY "Users can delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = id);

CREATE POLICY "Admins can delete any profile" ON user_profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add DELETE policy for vehicle_transactions (needed for CASCADE to work properly)
CREATE POLICY "Admins can delete transactions from their yard" ON vehicle_transactions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin' AND yard_id = vehicle_transactions.yard_id
        )
    );

-- Add DELETE policies for other tables that reference user_profiles
CREATE POLICY "Admins can delete vehicle sales from their yard" ON vehicle_sales
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin' AND yard_id = vehicle_sales.yard_id
        )
    );

CREATE POLICY "Admins can delete cash transactions from their yard" ON cash_transactions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = cash_transactions.yard_id
        )
    );

CREATE POLICY "Admins can delete expenses from their yard" ON expenses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin' AND yard_id = expenses.yard_id
        )
    );

CREATE POLICY "Admins can delete impound vehicles from their yard" ON impound_lien_vehicles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin' AND yard_id = impound_lien_vehicles.yard_id
        )
    );

CREATE POLICY "Admins can delete NMVTIS reports from their yard" ON nmvtis_reports
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin' AND yard_id = nmvtis_reports.yard_id
        )
    );

-- Create a safe user deletion function
CREATE OR REPLACE FUNCTION delete_user_safely(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
    target_user_data JSON;
    deletion_summary JSON;
    transaction_count INTEGER;
    sales_count INTEGER;
    cash_count INTEGER;
    expense_count INTEGER;
    impound_count INTEGER;
    report_count INTEGER;
BEGIN
    -- Check if current user is admin
    SELECT role INTO current_user_role 
    FROM user_profiles 
    WHERE id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only administrators can delete users'
        );
    END IF;
    
    -- Get target user data before deletion
    SELECT json_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'role', role,
        'status', status
    ) INTO target_user_data
    FROM user_profiles
    WHERE id = target_user_id;
    
    IF target_user_data IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Count related records before deletion
    SELECT COUNT(*) INTO transaction_count FROM vehicle_transactions WHERE user_id = target_user_id;
    SELECT COUNT(*) INTO sales_count FROM vehicle_sales WHERE user_id = target_user_id;
    SELECT COUNT(*) INTO cash_count FROM cash_transactions WHERE user_id = target_user_id;
    SELECT COUNT(*) INTO expense_count FROM expenses WHERE user_id = target_user_id;
    SELECT COUNT(*) INTO impound_count FROM impound_lien_vehicles WHERE user_id = target_user_id;
    SELECT COUNT(*) INTO report_count FROM nmvtis_reports WHERE user_id = target_user_id;
    
    -- Delete user profile (CASCADE will handle related records)
    DELETE FROM user_profiles WHERE id = target_user_id;
    
    -- Prepare deletion summary
    deletion_summary := json_build_object(
        'success', true,
        'deleted_user', target_user_data,
        'deleted_records', json_build_object(
            'vehicle_transactions', transaction_count,
            'vehicle_sales', sales_count,
            'cash_transactions', cash_count,
            'expenses', expense_count,
            'impound_vehicles', impound_count,
            'nmvtis_reports', report_count
        ),
        'message', 'User and all related records deleted successfully'
    );
    
    RETURN deletion_summary;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Deletion failed: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_safely TO authenticated;

-- Create a function to delete users from auth.users table (admin only)
CREATE OR REPLACE FUNCTION delete_auth_user(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
    auth_user_exists BOOLEAN;
BEGIN
    -- Check if current user is admin
    SELECT role INTO current_user_role 
    FROM user_profiles 
    WHERE id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only administrators can delete auth users'
        );
    END IF;
    
    -- Check if auth user exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) INTO auth_user_exists;
    
    IF NOT auth_user_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Auth user not found'
        );
    END IF;
    
    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Auth user deleted successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Auth user deletion failed: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_auth_user TO authenticated;

-- Create a complete user deletion function (profile + auth)
CREATE OR REPLACE FUNCTION delete_user_complete(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
    profile_result JSON;
    auth_result JSON;
BEGIN
    -- Check if current user is admin
    SELECT role INTO current_user_role 
    FROM user_profiles 
    WHERE id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only administrators can delete users'
        );
    END IF;
    
    -- First delete user profile and related data
    profile_result := delete_user_safely(target_user_id);
    
    -- If profile deletion failed, return error
    IF (profile_result->>'success')::boolean = false THEN
        RETURN profile_result;
    END IF;
    
    -- Then delete auth user
    auth_result := delete_auth_user(target_user_id);
    
    -- Return combined result
    RETURN json_build_object(
        'success', true,
        'profile_deletion', profile_result,
        'auth_deletion', auth_result,
        'message', 'User completely deleted from both profile and auth tables'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Complete user deletion failed: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_complete TO authenticated;

-- Create a function for users to delete their own account (no admin check)
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    target_user_data JSON;
    deletion_summary JSON;
    transaction_count INTEGER;
    sales_count INTEGER;
    cash_count INTEGER;
    expense_count INTEGER;
    impound_count INTEGER;
    report_count INTEGER;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No authenticated user'
        );
    END IF;
    
    -- Get user data before deletion
    SELECT json_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'role', role,
        'status', status
    ) INTO target_user_data
    FROM user_profiles
    WHERE id = current_user_id;
    
    IF target_user_data IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User profile not found'
        );
    END IF;
    
    -- Count related records before deletion
    SELECT COUNT(*) INTO transaction_count FROM vehicle_transactions WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO sales_count FROM vehicle_sales WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO cash_count FROM cash_transactions WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO expense_count FROM expenses WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO impound_count FROM impound_lien_vehicles WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO report_count FROM nmvtis_reports WHERE user_id = current_user_id;
    
    -- Delete user profile (CASCADE will handle related records)
    DELETE FROM user_profiles WHERE id = current_user_id;
    
    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = current_user_id;
    
    -- Prepare deletion summary
    deletion_summary := json_build_object(
        'success', true,
        'deleted_user', target_user_data,
        'deleted_records', json_build_object(
            'vehicle_transactions', transaction_count,
            'vehicle_sales', sales_count,
            'cash_transactions', cash_count,
            'expenses', expense_count,
            'impound_vehicles', impound_count,
            'nmvtis_reports', report_count
        ),
        'message', 'Account and all related records deleted successfully'
    );
    
    RETURN deletion_summary;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Account deletion failed: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_my_account TO authenticated;

-- Create a function for drivers to delete only their profile (keeping transactions)
CREATE OR REPLACE FUNCTION delete_driver_profile_only()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    current_user_role TEXT;
    target_user_data JSON;
    deletion_summary JSON;
    transaction_count INTEGER;
    sales_count INTEGER;
    cash_count INTEGER;
    expense_count INTEGER;
    impound_count INTEGER;
    report_count INTEGER;
BEGIN
    -- Get current user ID and role
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No authenticated user'
        );
    END IF;
    
    -- Get user role to ensure only drivers can use this function
    SELECT role INTO current_user_role 
    FROM user_profiles 
    WHERE id = current_user_id;
    
    IF current_user_role IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User profile not found'
        );
    END IF;
    
    IF current_user_role != 'driver' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'This function is only available for driver accounts'
        );
    END IF;
    
    -- Get user data before deletion
    SELECT json_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'role', role,
        'status', status
    ) INTO target_user_data
    FROM user_profiles
    WHERE id = current_user_id;
    
    -- Count related records (these will be kept)
    SELECT COUNT(*) INTO transaction_count FROM vehicle_transactions WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO sales_count FROM vehicle_sales WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO cash_count FROM cash_transactions WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO expense_count FROM expenses WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO impound_count FROM impound_lien_vehicles WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO report_count FROM nmvtis_reports WHERE user_id = current_user_id;
    
    -- Update related records to remove user reference (set user_id to NULL or admin)
    -- This keeps the transactions but removes the driver association
    UPDATE vehicle_transactions SET user_id = NULL WHERE user_id = current_user_id;
    UPDATE vehicle_sales SET user_id = NULL WHERE user_id = current_user_id;
    UPDATE cash_transactions SET user_id = NULL WHERE user_id = current_user_id;
    UPDATE expenses SET user_id = NULL WHERE user_id = current_user_id;
    UPDATE impound_lien_vehicles SET user_id = NULL WHERE user_id = current_user_id;
    UPDATE nmvtis_reports SET user_id = NULL WHERE user_id = current_user_id;
    
    -- Delete only the user profile (not auth record, transactions remain)
    DELETE FROM user_profiles WHERE id = current_user_id;
    
    -- Delete from auth.users to fully remove the account
    DELETE FROM auth.users WHERE id = current_user_id;
    
    -- Prepare deletion summary
    deletion_summary := json_build_object(
        'success', true,
        'deleted_user', target_user_data,
        'preserved_records', json_build_object(
            'vehicle_transactions', transaction_count,
            'vehicle_sales', sales_count,
            'cash_transactions', cash_count,
            'expenses', expense_count,
            'impound_vehicles', impound_count,
            'nmvtis_reports', report_count
        ),
        'message', 'Driver account deleted successfully. All transactions preserved for admin access.'
    );
    
    RETURN deletion_summary;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Driver account deletion failed: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_driver_profile_only TO authenticated;

-- Test query to check if deletion policies are working
-- (Run this to verify the setup)
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN (
    'user_profiles', 
    'vehicle_transactions', 
    'vehicle_sales', 
    'cash_transactions', 
    'expenses', 
    'impound_lien_vehicles', 
    'nmvtis_reports'
) 
AND cmd = 'DELETE'
ORDER BY tablename, policyname; 