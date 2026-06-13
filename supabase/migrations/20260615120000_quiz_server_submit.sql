-- Server-authoritative lesson quiz submission.
-- Students submit lesson_id + raw answers only; scores are computed in the database.

CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_quiz_submissions_student_lesson_unique
  ON public.lesson_quiz_submissions (student_id, lesson_id);

CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(
  p_lesson_id uuid,
  p_answers jsonb
)
RETURNS public.lesson_quiz_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_quiz jsonb;
  v_published boolean;
  v_qcount int;
  v_i int;
  v_q jsonb;
  v_type text;
  v_points numeric;
  v_correct int;
  v_student jsonb;
  v_selected int;
  v_essay text;
  v_auto_score numeric := 0;
  v_total_points numeric := 0;
  v_auto_total numeric := 0;
  v_essay_count int := 0;
  v_status text;
  v_percentage numeric;
  v_stored_answers jsonb := '[]'::jsonb;
  v_answer_item jsonb;
  v_earned numeric;
  v_is_correct boolean;
  v_result public.lesson_quiz_submissions;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' THEN
    RAISE EXCEPTION 'Invalid answers payload' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lesson_quiz_submissions
    WHERE student_id = v_uid
      AND lesson_id = p_lesson_id
  ) THEN
    RAISE EXCEPTION 'Quiz already submitted for this lesson' USING ERRCODE = '23505';
  END IF;

  SELECT l.quiz, l.published
  INTO v_quiz, v_published
  FROM public.lessons l
  WHERE l.id = p_lesson_id
    AND COALESCE(l.is_deleted, false) = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_published AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Lesson not available' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(v_quiz) <> 'array' OR jsonb_array_length(v_quiz) = 0 THEN
    RAISE EXCEPTION 'Lesson has no quiz' USING ERRCODE = 'P0001';
  END IF;

  v_qcount := jsonb_array_length(v_quiz);

  FOR v_i IN 0..(v_qcount - 1) LOOP
    v_q := v_quiz -> v_i;
    v_type := COALESCE(v_q ->> 'type', 'multiple_choice');
    v_points := COALESCE((v_q ->> 'points')::numeric, 1);
    IF v_points <= 0 THEN
      v_points := 1;
    END IF;
    v_total_points := v_total_points + v_points;

    SELECT elem
    INTO v_student
    FROM jsonb_array_elements(p_answers) AS elem
    WHERE COALESCE((elem ->> 'questionIndex')::int, -1) = v_i
    LIMIT 1;

    IF v_student IS NULL THEN
      RAISE EXCEPTION 'Missing answer for question %', v_i + 1 USING ERRCODE = 'P0001';
    END IF;

    IF v_type = 'essay' THEN
      v_essay_count := v_essay_count + 1;
      v_essay := trim(COALESCE(v_student ->> 'essayText', v_student ->> 'essay_text', ''));
      IF v_essay = '' THEN
        RAISE EXCEPTION 'Missing essay answer for question %', v_i + 1 USING ERRCODE = 'P0001';
      END IF;

      v_answer_item := jsonb_build_object(
        'questionIndex', v_i,
        'type', 'essay',
        'essayText', v_essay,
        'points', v_points,
        'earned', 0,
        'status', 'pending_review'
      );
    ELSE
      v_correct := COALESCE((v_q ->> 'answer')::int, 0);
      v_selected := COALESCE(
        (v_student ->> 'selectedIndex')::int,
        (v_student ->> 'selected_index')::int,
        -1
      );
      IF v_selected < 0 THEN
        RAISE EXCEPTION 'Missing selected answer for question %', v_i + 1 USING ERRCODE = 'P0001';
      END IF;

      v_auto_total := v_auto_total + v_points;
      v_is_correct := (v_selected = v_correct);
      IF v_is_correct THEN
        v_auto_score := v_auto_score + v_points;
      END IF;
      v_earned := CASE WHEN v_is_correct THEN v_points ELSE 0 END;

      v_answer_item := jsonb_build_object(
        'questionIndex', v_i,
        'type', v_type,
        'selectedIndex', v_selected,
        'correctIndex', v_correct,
        'points', v_points,
        'earned', v_earned,
        'status', 'auto_graded'
      );
    END IF;

    v_stored_answers := v_stored_answers || jsonb_build_array(v_answer_item);
  END LOOP;

  v_status := CASE WHEN v_essay_count > 0 THEN 'pending_review' ELSE 'reviewed' END;
  v_percentage := CASE
    WHEN v_total_points > 0 THEN round((v_auto_score / v_total_points) * 100)
    ELSE 0
  END;

  INSERT INTO public.lesson_quiz_submissions (
    student_id,
    lesson_id,
    score,
    auto_score,
    essay_score,
    final_score,
    total_points,
    percentage,
    status,
    answers
  )
  VALUES (
    v_uid,
    p_lesson_id,
    v_auto_score,
    v_auto_score,
    0,
    v_auto_score,
    v_total_points,
    v_percentage,
    v_status,
    v_stored_answers
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_lesson_quiz(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(uuid, jsonb) TO authenticated;

DROP POLICY IF EXISTS lesson_quiz_submissions_insert ON public.lesson_quiz_submissions;
REVOKE INSERT ON public.lesson_quiz_submissions FROM authenticated;
