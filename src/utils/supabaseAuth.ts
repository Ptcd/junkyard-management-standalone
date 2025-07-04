import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from "./config";

// Create Supabase client with standard settings (no custom CORS headers)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: "junkyard-auth-main",
  },
  global: {
    headers: {
      'X-Client-Info': 'junkyard-management-main'
    }
  },
  db: {
    schema: 'public'
  }
});

// Create admin client for admin operations (like inviting users)
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        storageKey: "junkyard-auth-admin",
      },
      global: {
        headers: {
          'X-Client-Info': 'junkyard-management-admin'
        }
      }
    })
  : null;

export interface User {
  id: string;
  role: "admin" | "driver";
  yardId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  status: "active" | "inactive";
  createdAt?: string;
}

export interface AuthUser {
  user: User | null;
  session: any;
}

// Invite user via email (better than signUp with password)
export const inviteUser = async (
  email: string,
  userData: Partial<User>,
) => {
  try {
    console.log("Inviting user:", email, userData);

    if (!supabaseAdmin) {
      throw new Error("Admin operations require SUPABASE_SERVICE_ROLE_KEY to be configured. Please add it to your environment variables.");
    }

    // Use Supabase's invitation flow with admin client
    const redirectTo = `${window.location.origin}/complete-signup`;
    
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo,
      data: userData // This gets stored in user_metadata
    });

    if (error) {
      console.error("Invitation error:", error);
      
      if (error.message.includes('already registered')) {
        throw new Error("An account with this email already exists.");
      }
      if (error.message.includes('invalid email')) {
        throw new Error("Please enter a valid email address.");
      }
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error(`Email invitation rate limit exceeded. Please wait 1 hour before sending more invitations, or create users manually in your Supabase dashboard (Authentication → Users → Add user).`);
      }
      
      throw error;
    }

    console.log("Invitation sent successfully:", data);

    // Store role and user data in a pending invitations table or user_profiles
    if (data.user) {
      // Use upsert to handle existing profiles gracefully
      const profileData = {
        id: data.user.id,
        email: email,
        role: userData.role || "driver",
        yard_id: userData.yardId || "default-yard",
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        license_number: userData.licenseNumber || "",
        status: "pending", // User needs to complete signup
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating/updating user profile:", profileData);

      // Use upsert (insert with conflict resolution) to handle existing records
      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false // Update existing record if conflict
        });

      if (profileError) {
        console.error("Profile creation/update failed:", profileError);
        // Don't throw here - the invitation was still sent successfully
        console.warn("Profile creation failed, but invitation was sent. User can still complete signup.");
      } else {
        console.log("User profile created/updated successfully");
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error("Invite user error:", error);
    return { data: null, error };
  }
};

// Sign in user
export const signIn = async (email: string, password: string) => {
  try {
    // Clear any existing session first
    await supabase.auth.signOut();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error);
      throw error;
    }

    if (data.user) {
      // Get user profile with retry logic for mobile
      let profile = null;
      let profileError = null;
      let retries = 3;

      while (retries > 0 && !profile) {
        try {
          const { data: profileData, error: pError } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

          if (pError) throw pError;
          profile = profileData;
          break;
        } catch (e) {
          profileError = e;
          retries--;
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }
      }

      if (profileError) throw profileError;

      const user: User = {
        id: profile.id,
        role: profile.role,
        yardId: profile.yard_id || "default-yard",
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        licenseNumber: profile.license_number || "",
        status: profile.status || "active",
        createdAt: profile.created_at,
      };

      return { user, session: data.session, error: null };
    }

    return { user: null, session: null, error: "No user data" };
  } catch (error) {
    console.error("Authentication error:", error);
    return { user: null, session: null, error };
  }
};

// Sign out user
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("No authenticated user found");
      return { user: null, error: "No authenticated user" };
    }

    console.log("Found authenticated user:", user.id, user.email);

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile lookup failed for user:", user.id, profileError);
      throw profileError;
    }

    if (!profile) {
      console.error("No profile found for authenticated user:", user.id);
      throw new Error("User profile not found - contact administrator");
    }

    console.log("Found user profile:", profile.first_name, profile.last_name, profile.role);

    const userData: User = {
      id: profile.id,
      role: profile.role,
      yardId: profile.yard_id || "default-yard",
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      licenseNumber: profile.license_number || "",
      status: profile.status || "active",
      createdAt: profile.created_at,
    };

    return { user: userData, error: null };
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return { user: null, error };
  }
};

// Password reset
export const resetPassword = async (email: string) => {
  try {
    // Determine the correct redirect URL based on the current environment
    const baseURL = window.location.origin;
    const redirectTo = `${baseURL}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });
    
    if (error) {
      // Provide more specific error messages for common issues
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error("Too many password reset attempts. Please wait an hour before trying again, or contact support if you continue to have issues.");
      }
      if (error.message.includes('email not found') || error.message.includes('user not found')) {
        throw new Error("No account found with this email address. Please check your email or sign up for a new account.");
      }
      throw error;
    }
    
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Update user profile
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>,
) => {
  try {
    const { error } = await supabase
      .from("user_profiles")
      .update({
        first_name: updates.firstName,
        last_name: updates.lastName,
        phone: updates.phone,
        role: updates.role,
        license_number: updates.licenseNumber,
        status: updates.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Get all users (admin only)
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const users: User[] = data.map((profile: any) => ({
      id: profile.id,
      role: profile.role,
      yardId: profile.yard_id || "default-yard",
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      licenseNumber: profile.license_number || "",
      status: profile.status || "active",
      createdAt: profile.created_at,
    }));

    return { users, error: null };
  } catch (error) {
    return { users: [], error };
  }
};

// Delete current user account
export const deleteAccount = async () => {
  try {
    console.log("Starting deleteAccount process...");
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("No authenticated user found");
      return { error: "No authenticated user" };
    }

    console.log("User found:", user.id);

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error getting user profile:", profileError);
      return { error: "Could not determine user role" };
    }

    console.log("User profile found, role:", profile.role);

    // Use different deletion methods based on role
    if (profile.role === 'driver') {
      console.log("Attempting driver deletion with delete_driver_profile_only...");
      
      // For drivers, use the special function that preserves transactions
      const { data, error } = await supabase.rpc('delete_driver_profile_only');

      console.log("Driver deletion response:", { data, error });

      if (error) {
        console.error("Error calling delete_driver_profile_only:", error);
        
        // If the function doesn't exist, try manual deletion
        if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
          console.log("Function doesn't exist, trying manual driver deletion...");
          
          try {
            // Manual approach: Set user_id to NULL on all transactions, then delete profile
            console.log("Setting user_id to NULL on all transactions...");
            
            // Update transactions to preserve them but remove user association
            const updatePromises = [
              supabase.from("vehicle_transactions").update({ user_id: null }).eq("user_id", user.id),
              supabase.from("vehicle_sales").update({ user_id: null }).eq("user_id", user.id),
              supabase.from("cash_transactions").update({ user_id: null }).eq("user_id", user.id),
              supabase.from("expenses").update({ user_id: null }).eq("user_id", user.id),
              supabase.from("impound_lien_vehicles").update({ user_id: null }).eq("user_id", user.id),
              supabase.from("nmvtis_reports").update({ user_id: null }).eq("user_id", user.id),
            ];
            
            await Promise.all(updatePromises);
            console.log("Successfully updated all transaction records");
            
            // Delete the user profile
            const { error: profileError } = await supabase
              .from("user_profiles")
              .delete()
              .eq("id", user.id);

            if (profileError) throw profileError;
            console.log("Successfully deleted user profile");

            // Sign out the user
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) throw signOutError;
            console.log("Successfully signed out user");

            return { 
              error: null, 
              message: "Driver account deleted successfully. All transactions preserved for admin access." 
            };
          } catch (manualError) {
            console.error("Manual deletion failed:", manualError);
            return { error: manualError instanceof Error ? manualError.message : "Manual deletion failed" };
          }
        }
        
        return { error: error.message || "Failed to delete driver account" };
      }

      // Check if the function succeeded
      if (data && typeof data === 'object') {
        if (data.success) {
          console.log("Driver deletion successful:", data);
          return { 
            error: null, 
            message: data.message || "Driver account deleted successfully. Transactions preserved.",
            deletionSummary: data 
          };
        } else {
          console.error("Driver deletion failed:", data.error);
          
          // If the SQL function failed due to column issues, try manual deletion
          if (data.error && data.error.includes('column') && data.error.includes('does not exist')) {
            console.log("SQL function has column issues, trying manual driver deletion...");
            
            try {
              // Manual approach: Set user_id to NULL on all transactions, then delete profile
              console.log("Setting user_id to NULL on all transactions...");
              
              // Update transactions to preserve them but remove user association
              const updatePromises = [
                supabase.from("vehicle_transactions").update({ user_id: null }).eq("user_id", user.id),
                supabase.from("vehicle_sales").update({ user_id: null }).eq("user_id", user.id),
                supabase.from("cash_transactions").update({ user_id: null }).eq("user_id", user.id),
                supabase.from("expenses").update({ user_id: null }).eq("user_id", user.id),
                supabase.from("impound_lien_vehicles").update({ user_id: null }).eq("user_id", user.id),
                supabase.from("nmvtis_reports").update({ user_id: null }).eq("user_id", user.id),
              ];
              
              await Promise.all(updatePromises);
              console.log("Successfully updated all transaction records");
              
              // Delete the user profile
              const { error: profileError } = await supabase
                .from("user_profiles")
                .delete()
                .eq("id", user.id);

              if (profileError) throw profileError;
              console.log("Successfully deleted user profile");

              // Sign out the user
              const { error: signOutError } = await supabase.auth.signOut();
              if (signOutError) throw signOutError;
              console.log("Successfully signed out user");

              return { 
                error: null, 
                message: "Driver account deleted successfully. All transactions preserved for admin access." 
              };
            } catch (manualError) {
              console.error("Manual deletion failed:", manualError);
              return { error: manualError instanceof Error ? manualError.message : "Manual deletion failed" };
            }
          }
          
          return { error: data.error || "Driver account deletion failed" };
        }
      }

      console.error("Unexpected response from driver deletion function:", data);
      return { error: "Unexpected response from driver deletion function" };
    } else {
      console.log("Attempting admin deletion with delete_my_account...");
      
      // For admins, use the complete deletion function
      const { data, error } = await supabase.rpc('delete_my_account');

      console.log("Admin deletion response:", { data, error });

      if (error) {
        console.error("Error calling delete_my_account:", error);
        // Fallback to manual deletion if the function fails
        try {
          // First delete the user profile
          const { error: profileError } = await supabase
            .from("user_profiles")
            .delete()
            .eq("id", user.id);

          if (profileError) throw profileError;

          // Sign out the user (they won't be able to sign back in since profile is deleted)
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) throw signOutError;

          return { error: null, message: "Account deleted (profile only - auth record may remain)" };
        } catch (fallbackError) {
          return { error: fallbackError };
        }
      }

      // Check if the function succeeded
      if (data && typeof data === 'object') {
        if (data.success) {
          return { 
            error: null, 
            message: data.message || "Account deleted completely from Supabase",
            deletionSummary: data 
          };
        } else {
          return { error: data.error || "Account deletion failed" };
        }
      }

      return { error: "Unexpected response from deletion function" };
    }
  } catch (error) {
    console.error("Error in deleteAccount:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete account" };
  }
};

// Admin function to delete any user (profile + auth)
export const deleteUserAsAdmin = async (targetUserId: string) => {
  try {
    console.log("Starting admin deletion for user:", targetUserId);
    
    if (!supabaseAdmin) {
      throw new Error("Admin operations require SUPABASE_SERVICE_ROLE_KEY to be configured.");
    }
    
    // First get user info before deletion
    const { data: userData, error: getUserError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();
      
    if (getUserError) {
      console.error("Error getting user data:", getUserError);
      return { error: "User not found" };
    }
    
    console.log("Found user to delete:", userData.first_name, userData.last_name);
    
    try {
      // Step 1: Delete user profile and preserve their data
      // Set user_id to null for all their records to preserve business data
      console.log("Preserving user data by nullifying user_id references...");
      
      const updatePromises = [
        supabase.from("vehicle_transactions").update({ user_id: null }).eq("user_id", targetUserId),
        supabase.from("vehicle_sales").update({ user_id: null }).eq("user_id", targetUserId),
        supabase.from("cash_transactions").update({ user_id: null }).eq("user_id", targetUserId),
        supabase.from("expenses").update({ user_id: null }).eq("user_id", targetUserId),
        supabase.from("impound_lien_vehicles").update({ user_id: null }).eq("user_id", targetUserId),
        supabase.from("nmvtis_reports").update({ user_id: null }).eq("user_id", targetUserId),
      ];
      
      await Promise.all(updatePromises);
      console.log("Successfully preserved all user data");
      
      // Step 2: Delete the user profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", targetUserId);
        
      if (profileError) {
        console.error("Error deleting user profile:", profileError);
        return { error: profileError.message || "Failed to delete user profile" };
      }
      
      console.log("Successfully deleted user profile");
      
      // Step 3: Delete the auth record so they can be re-invited (using admin client)
      console.log("Deleting auth record...");
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      
      if (authDeleteError) {
        console.warn("Failed to delete auth record:", authDeleteError);
        // Don't fail the whole operation if auth deletion fails
        // The user profile is already deleted, which is the main goal
        return { 
          success: true, 
          message: `User ${userData.first_name} ${userData.last_name} profile deleted successfully. Auth record deletion failed - they may not be able to be re-invited with the same email.`,
          deletionSummary: {
            deleted_user: userData,
            auth_deletion_failed: true,
            message: "Profile deleted, auth record may still exist"
          }
        };
      }
      
      console.log("Successfully deleted auth record");
      
      return { 
        success: true, 
        message: `User ${userData.first_name} ${userData.last_name} completely deleted. They can now be re-invited with the same email address.`,
        deletionSummary: {
          deleted_user: userData,
          auth_deleted: true,
          data_preserved: true,
          message: "User completely deleted - can be re-invited"
        }
      };
      
    } catch (deleteError) {
      console.error("Deletion process failed:", deleteError);
      return { error: deleteError instanceof Error ? deleteError.message : "Deletion process failed" };
    }
    
  } catch (error) {
    console.error("Error in deleteUserAsAdmin:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete user" };
  }
};

// Admin function to delete user profile only (keeps auth record)
export const deleteUserProfileOnly = async (targetUserId: string) => {
  try {
    // Call the database function that handles profile deletion only
    const { data, error } = await supabase.rpc('delete_user_safely', {
      target_user_id: targetUserId
    });

    if (error) {
      console.error("Error calling delete_user_safely:", error);
      return { error: error.message || "Failed to delete user profile" };
    }

    // The function returns JSON with success/error info
    if (data && typeof data === 'object') {
      if (data.success) {
        return { 
          success: true, 
          message: data.message,
          deletionSummary: data 
        };
      } else {
        return { error: data.error || "Profile deletion failed" };
      }
    }

    return { error: "Unexpected response from deletion function" };
  } catch (error) {
    console.error("Error in deleteUserProfileOnly:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete user profile" };
  }
};

// Temporary function to clean up orphaned auth records
export const deleteOrphanedAuthRecord = async (email: string) => {
  try {
    console.log("Looking for orphaned auth record for email:", email);
    
    if (!supabaseAdmin) {
      throw new Error("Admin operations require SUPABASE_SERVICE_ROLE_KEY to be configured.");
    }
    
    // First, check if user exists in auth but not in profiles
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return { error: "Failed to list users" };
    }
    
    const orphanedUser = authUsers.users.find(user => user.email === email);
    
    if (!orphanedUser) {
      return { error: "No auth record found for this email" };
    }
    
    console.log("Found orphaned auth record:", orphanedUser.id);
    
    // Delete the auth record
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(orphanedUser.id);
    
    if (deleteError) {
      console.error("Failed to delete auth record:", deleteError);
      return { error: deleteError.message || "Failed to delete auth record" };
    }
    
    console.log("Successfully deleted orphaned auth record");
    return { 
      success: true, 
      message: `Orphaned auth record for ${email} deleted successfully. They can now be re-invited.` 
    };
    
  } catch (error) {
    console.error("Error deleting orphaned auth record:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete orphaned auth record" };
  }
};

// Helper function to check if user exists in auth by email
export const checkUserExistsInAuth = async (email: string) => {
  try {
    if (!supabaseAdmin) {
      throw new Error("Admin operations require SUPABASE_SERVICE_ROLE_KEY to be configured.");
    }
    
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return { error: "Failed to list users" };
    }
    
    const user = authUsers.users.find(user => user.email === email);
    
    return { 
      exists: !!user, 
      user: user || null,
      message: user ? `User exists in auth with ID: ${user.id}` : "User does not exist in auth"
    };
    
  } catch (error) {
    console.error("Error checking user existence:", error);
    return { error: error instanceof Error ? error.message : "Failed to check user existence" };
  }
};
