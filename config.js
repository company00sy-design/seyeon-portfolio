// Public Supabase configuration for the portfolio frontend.
// Keep secret/service_role keys out of this public repository.
window.SUPABASE_CONFIG = {
  url: 'https://qsqawzqlomswoomonwet.supabase.co',
  anonKey: 'sb_publishable_b70p5eME_JHRdH-vDR9jtw_YJ6qXMQx'
};

// Backward-compatible globals used by the existing frontend/admin scripts.
window.SUPABASE_URL = window.SUPABASE_CONFIG.url;
window.SUPABASE_ANON_KEY = window.SUPABASE_CONFIG.anonKey;
