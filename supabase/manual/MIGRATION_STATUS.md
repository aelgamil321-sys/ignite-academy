# Production migration status

## Production Supabase project

`aijukbdxyawxzekwhrdo`

## Manually applied migrations

The following migration files were **manually applied to production** (not via a routine `supabase db push` from this repository state):

| Version | File |
|---------|------|
| `20260827140000` | `supabase/migrations/20260827140000_articles_targeting_admin_hof_security.sql` |
| `20260828190000` | `supabase/migrations/20260828190000_admin_content_ownership_rls.sql` |

### Articles targeting / admin Hall of Fame security (`20260827140000`)

- Adds article creator and targeting fields, RLS hardening, and admin RPCs related to announcements and Hall of Fame access.

### Admin content ownership RLS (`20260828190000`)

- Enforces admin **SELECT** on all monitored content with **UPDATE/DELETE** limited to admin-owned rows (`created_by = auth.uid()`).
- Legacy rows with `NULL created_by` remain read-only for admin writes.
- **Production verification:** `supabase/manual/verify_admin_content_ownership_SUMMARY.sql` — **13/13 PASS**.

## Operational rules

- **DO NOT** manually re-run these migrations against production.
- The SQL files are kept in the repository for source control and history consistency.
- **Production migration-history reconciliation has NOT been performed yet** in Supabase CLI metadata.
- Before any future production `supabase db push`, run `supabase migration list` and compare local vs remote history.
- If production migration history does **not** mark these versions as applied, reconcile deliberately using the appropriate Supabase migration-history repair procedure **before** pushing.
- **Never** run migration repair blindly.
- **Never** run `db push` until local and remote migration history have been reviewed together.

## Related documentation

- Manual apply copy: `supabase/manual/20260828190000_admin_content_ownership_rls_MANUAL.sql`
- Verification (summary): `supabase/manual/verify_admin_content_ownership_SUMMARY.sql`
- Verification (detailed): `supabase/manual/verify_admin_content_ownership_READ_ONLY.sql`
- Optional script (read-only checks): `scripts/verify-admin-content-ownership.mjs`
