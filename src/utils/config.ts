// Supabase Configuration
export const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || "";

// Debug: Log environment variables to help troubleshoot
console.log("Environment variables debug:");
console.log("SUPABASE_URL:", SUPABASE_URL ? "✓ Set" : "❌ Missing");
console.log("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✓ Set" : "❌ Missing");
console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✓ Set" : "❌ Missing");
console.log("All REACT_APP vars:", Object.keys(process.env).filter(key => key.startsWith('REACT_APP')));

// Site Configuration
export const SITE_URL = "https://junk.autosalvageautomation.com";

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing Supabase configuration. Please check your environment variables.",
  );
}

// Warn if service role key is missing (needed for admin functions)
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "Missing SUPABASE_SERVICE_ROLE_KEY. Admin functions like user invitations will not work.",
  );
}

// Additional configuration
export const APP_VERSION = "1.0.4";
export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

// CORS configuration
export const CORS_SETTINGS = {
  headers: {
    "Access-Control-Allow-Origin": SITE_URL,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  },
};
