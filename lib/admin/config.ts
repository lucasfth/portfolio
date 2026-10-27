// Admin module configuration.
//
// ADMIN_EMAIL is the only signed-in identity the /admin page and the
// /api/admin/* endpoints accept. It must equal the email in the RLS policy
// in supabase/migrations/20261027170000_admin_reports.sql. Deliberately not
// env-overridable: a drifted value would let the API authorize an identity
// that RLS cannot read reports for (review finding F1).
export const ADMIN_EMAIL = "online@lucashanson.dk";