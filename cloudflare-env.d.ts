declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    PORTAL_SESSION_KEY?: string;
    PORTAL_OWNER_EMAIL?: string;
    PORTAL_OWNER_SETUP_TOKEN?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    BUCKET?: R2Bucket;
    /** "1" only on a public demo copy. Never set on the live portal. */
    DEMO_MODE?: string;
  }
}
