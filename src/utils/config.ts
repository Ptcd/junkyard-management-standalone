// Supabase Configuration
export const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Site Configuration
export const SITE_URL = 'https://junk.autosalvageautomation.com';

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
}

// Additional configuration
export const APP_VERSION = '1.0.0';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// CORS configuration
export const CORS_SETTINGS = {
  headers: {
    'Access-Control-Allow-Origin': SITE_URL,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  },
}; 