import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
export const signUp = async (email: string, password: string, userData: Partial<User>) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Insert user profile data - matching actual database schema
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: data.user.id,
            username: data.user.email, // Use email as username since we removed username field from signup
            email: data.user.email,
            role: userData.role || 'driver',
            yard_id: userData.yardId || 'default-yard', // Use yard_id (text) instead of junkyard_id
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
            license_number: userData.licenseNumber || '',
            hire_date: new Date().toISOString().split('T')[0], // Today's date
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (profileError) throw profileError;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Sign in user
export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      const user: User = {
        id: profile.id,
        role: profile.role,
        yardId: profile.yard_id || 'default-yard',
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        licenseNumber: profile.license_number || '',
        status: profile.status || 'active',
        createdAt: profile.created_at,
      };

      return { user, session: data.session, error: null };
    }

    return { user: null, session: null, error: 'No user data' };
  } catch (error) {
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { user: null, error: 'No authenticated user' };

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const userData: User = {
      id: profile.id,
      role: profile.role,
      yardId: profile.yard_id || 'default-yard',
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      licenseNumber: profile.license_number || '',
      status: profile.status || 'active',
      createdAt: profile.created_at,
    };

    return { user: userData, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

// Password reset
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { error };
};

// Update user profile
export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        first_name: updates.firstName,
        last_name: updates.lastName,
        phone: updates.phone,
        role: updates.role,
        license_number: updates.licenseNumber,
        status: updates.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

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
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const users: User[] = data.map((profile: any) => ({
      id: profile.id,
      role: profile.role,
      yardId: profile.yard_id || 'default-yard',
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      licenseNumber: profile.license_number || '',
      status: profile.status || 'active',
      createdAt: profile.created_at,
    }));

    return { users, error: null };
  } catch (error) {
    return { users: [], error };
  }
}; 