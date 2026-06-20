-- Remove duplicate lesson_quiz_submissions before the unique (student_id, lesson_id) index.
-- Keeps one row per pair using: reviewed > pending_review, then highest percentage, then newest submitted_at.

DO $$
DECLARE
  v_deleted int;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.lesson_quiz_submissions
    GROUP BY student_id, lesson_id
    HAVING count(*) > 1
  ) THEN
    RAISE NOTICE 'No duplicate lesson_quiz_submissions rows found.';
    RETURN;
  END IF;

  CREATE TEMP TABLE _quiz_submission_dedupe ON COMMIT DROP AS
  WITH ranked AS (
    SELECT
      id,
      student_id,
      lesson_id,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, lesson_id
        ORDER BY
          CASE WHEN status = 'reviewed' THEN 0 ELSE 1 END,
          percentage DESC NULLS LAST,
          submitted_at DESC NULLS LAST,
          id DESC
      ) AS rn
    FROM public.lesson_quiz_submissions
  )
  SELECT
    r.id AS dupe_id,
    k.id AS keeper_id
  FROM ranked r
  JOIN ranked k
    ON k.student_id = r.student_id
   AND k.lesson_id = r.lesson_id
   AND k.rn = 1
  WHERE r.rn > 1;

  -- Preserve certificates linked to rows we are about to delete.
  UPDATE public.quiz_certificates qc
  SET submission_id = d.keeper_id
  FROM _quiz_submission_dedupe d
  WHERE qc.submission_id = d.dupe_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.quiz_certificates existing
      WHERE existing.submission_id = d.keeper_id
    );

  DELETE FROM public.quiz_certificates qc
  USING _quiz_submission_dedupe d
  WHERE qc.submission_id = d.dupe_id;

  DELETE FROM public.lesson_quiz_submissions lqs
  USING _quiz_submission_dedupe d
  WHERE lqs.id = d.dupe_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate lesson_quiz_submissions row(s).', v_deleted;
END;
$$;
