# Production migration status

## Production Supabase project

`aijukbdxyawxzekwhrdo`

## Manually applied migrations

The following migration files were **manually applied to production** (not via a routine `supabase db push` from this repository state):

| Version | File |
|---------|------|
| `20260827140000` | `supabase/migrations/20260827140000_articles_targeting_admin_hof_security.sql` |
| `20260828190000` | `supabase/migrations/20260828190000_admin_content_ownership_rls.sql` |
| `20260829120000` | `supabase/migrations/20260829120000_teacher_announcement_targeting_rls.sql` |
| `20260829140000` | `supabase/migrations/20260829140000_teacher_timetables.sql` |
| `20260829150000` | `supabase/migrations/20260829150000_parent_explicit_links_security.sql` |

### Articles targeting / admin Hall of Fame security (`20260827140000`)

- Adds article creator and targeting fields, RLS hardening, and admin RPCs related to announcements and Hall of Fame access.

### Admin content ownership RLS (`20260828190000`)

- Enforces admin **SELECT** on all monitored content with **UPDATE/DELETE** limited to admin-owned rows (`created_by = auth.uid()`).
- Legacy rows with `NULL created_by` remain read-only for admin writes.
- **Production verification:** `supabase/manual/verify_admin_content_ownership_SUMMARY.sql` — **13/13 PASS**.

### Teacher announcement targeting RLS (`20260829120000`)

- Tightens teacher article **INSERT/UPDATE/DELETE** policies for announcement targeting and ownership.
- Normal teachers: assigned grade/section, audiences `students`/`parents`, own-row mutation only.
- Lead teachers (HOD): broader targeting on INSERT/WITH CHECK; **UPDATE/DELETE own rows only** (no peer ownership bypass).
- Does **not** modify admin policies, published-read policies, `articles_teacher_select`, or `articles_protect_metadata`.
- Islamic-group article targeting remains intentionally unsupported (`articles` has no `target_islamic_group` column).
- **Status:** **MANUALLY APPLIED TO PRODUCTION — VERIFIED**
- **Manual apply copy:** `supabase/manual/20260829120000_teacher_announcement_targeting_rls_MANUAL.sql`
- **Production verification:** `supabase/manual/verify_teacher_announcement_targeting_rls.sql` — **catalog checks 1–9: ALL PASS**
- **Verification date:** 2026-08-29
- **Verification type:** production catalog/policy verification (not runtime user impersonation)
- **No `db push` performed**
- **No migration repair performed**

### Teacher timetables (`20260829140000`)

- Adds `teacher_timetables` table (one row per teacher), private `teacher-timetables` storage bucket, and ownership RLS.
- Teachers may upload/view/replace/delete **only their own** timetable file (PDF/PNG/JPEG/WebP, 10 MB max).
- `parsed_schedule` JSONB reserved for future server-side AI extraction; **not teacher-writable** (RLS + trigger guard).
- No Lead/HOD peer timetable access. Admin may read timetable metadata via existing `has_role` convention on table SELECT only.
- **Status:** **MANUALLY APPLIED TO PRODUCTION — VERIFIED**
- **Applied via:** Supabase SQL Editor (`supabase/manual/20260829140000_teacher_timetables_MANUAL.sql`)
- **Production verification:** `supabase/manual/verify_teacher_timetables_security_READ_ONLY.sql` — **executed successfully**
- **Verified:** timetable table + RLS; storage bucket + own-folder policies; MIME/size constraints; `parsed_schedule` protection
- **Verification date:** 2026-08-29
- **Verification type:** production catalog/policy verification (not runtime user impersonation)
- **No `db push` performed**
- **No migration repair performed**

### Parent explicit-links security (`20260829150000`)

- Replaces `parent_can_read_student(uuid)` so Parent academic access requires an explicit `parent_student_links` row.
- Removes legacy name+grade authorization from `parent_can_read_student`.
- Drops `trg_sync_parent_student_link` and `sync_parent_student_link_from_profile()`.
- Does **not** delete `parent_student_links` data or alter `redeem_parent_link_code`.
- **Status:** **APPLIED TO PRODUCTION — VERIFIED**
- **Manual apply copy:** `supabase/manual/20260829150000_parent_explicit_links_security_MANUAL.sql`
- **Apply script (Management API):** `scripts/apply-parent-explicit-links-security.mjs`
- **Production verification:** `supabase/manual/verify_parent_explicit_links_security_READ_ONLY.sql` or `scripts/verify-parent-explicit-links-security.mjs`
- **Verified:** `parent_can_read_student` uses explicit `parent_student_links` only; `uses_student_name = false`; `uses_student_grade = false`; `trg_sync_parent_student_link` absent; `sync_parent_student_link_from_profile` absent; `redeem_parent_link_code` preserved
- **Verification date:** 2026-08-29
- **Verification type:** production catalog/policy verification (not runtime user impersonation)
- **No `db push` performed**
- **No migration repair performed**

## Operational rules

- **DO NOT** manually re-run these migrations against production.
- The SQL files are kept in the repository for source control and history consistency.
- **Production migration-history reconciliation has NOT been performed yet** in Supabase CLI metadata.
- Before any future production `supabase db push`, run `supabase migration list` and compare local vs remote history.
- If production migration history does **not** mark these versions as applied, reconcile deliberately using the appropriate Supabase migration-history repair procedure **before** pushing.
- **Never** run migration repair blindly.
- **Never** run `db push` until local and remote migration history have been reviewed together.

## Related documentation

- Manual apply copy (admin ownership): `supabase/manual/20260828190000_admin_content_ownership_rls_MANUAL.sql`
- Manual apply copy (teacher announcement targeting): `supabase/manual/20260829120000_teacher_announcement_targeting_rls_MANUAL.sql`
- Manual apply copy (teacher timetables): `supabase/manual/20260829140000_teacher_timetables_MANUAL.sql`
- Manual apply copy (parent explicit-links security): `supabase/manual/20260829150000_parent_explicit_links_security_MANUAL.sql`
- Verification (admin summary): `supabase/manual/verify_admin_content_ownership_SUMMARY.sql`
- Verification (admin detailed): `supabase/manual/verify_admin_content_ownership_READ_ONLY.sql`
- Verification (teacher announcement targeting): `supabase/manual/verify_teacher_announcement_targeting_rls.sql`
- Verification (teacher timetables): `supabase/manual/verify_teacher_timetables_security_READ_ONLY.sql`
- Verification (parent explicit-links security): `supabase/manual/verify_parent_explicit_links_security_READ_ONLY.sql`
- Optional script (admin read-only checks): `scripts/verify-admin-content-ownership.mjs`
- Optional script (teacher read-only checks): `scripts/verify-teacher-announcement-targeting.mjs`
- Optional script (parent explicit-links apply): `scripts/apply-parent-explicit-links-security.mjs`
- Optional script (parent explicit-links verify): `scripts/verify-parent-explicit-links-security.mjs`
