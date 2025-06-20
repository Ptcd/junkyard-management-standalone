-- Essential Driver Deletion Function
-- Run this in your Supabase SQL Editor

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
        'role', role
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
    
    -- Update related records to remove user reference (set user_id to NULL)
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