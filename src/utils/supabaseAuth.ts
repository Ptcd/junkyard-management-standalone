import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Create Supabase client with standard settings (no custom CORS headers)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: "junkyard-auth-token",
  },
  global: {
    headers: {
      'X-Client-Info': 'junkyard-management-mobile'
    }
  },
  db: {
    schema: 'public'
  }
});

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

// Sign up a new user
export const signUp = async (
  email: string,
  password: string,
  userData: Partial<User>,
) => {
  try {
    console.log("Starting signUp with:", { email, userData });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role || "driver",
        },
      },
    });

    console.log("Auth signUp result:", { data, error });

    if (error) throw error;

    // If signup succeeds, try to update the profile
    if (data.user) {
      // Wait for trigger to create profile
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Try to update the profile with correct data
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          role: userData.role || "driver",
          yard_id: userData.yardId || "default-yard",
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          license_number: userData.licenseNumber || "",
          hire_date: new Date().toISOString().split("T")[0],
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.user.id);

      console.log("Profile update result:", { updateError });

      // Don't fail if profile update fails - the trigger should handle basic creation
      if (updateError) {
        console.warn(
          "Profile update failed, but user was created:",
          updateError,
        );
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error("SignUp error:", error);
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

    if (!user) return { user: null, error: "No authenticated user" };

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

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
    return { user: null, error };
  }
};

// Password reset
export const resetPassword = async (email: string) => {
  // Determine the correct redirect URL based on the current environment
  const baseURL = window.location.origin;
  const redirectTo = `${baseURL}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo,
  });
  
  return { error };
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "No authenticated user" };
    }

    // Use the database function to completely delete the current user's account
    const { data, error } = await supabase.rpc('delete_my_account');

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
        // The function deletes both profile and auth user
        // User will be automatically signed out when their auth record is removed
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
  } catch (error) {
    console.error("Error in deleteAccount:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete account" };
  }
};

// Admin function to delete any user (profile + auth)
export const deleteUserAsAdmin = async (targetUserId: string) => {
  try {
    // Call the database function that handles complete user deletion
    const { data, error } = await supabase.rpc('delete_user_complete', {
      target_user_id: targetUserId
    });

    if (error) {
      console.error("Error calling delete_user_complete:", error);
      return { error: error.message || "Failed to delete user" };
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
        return { error: data.error || "Deletion failed" };
      }
    }

    return { error: "Unexpected response from deletion function" };
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
