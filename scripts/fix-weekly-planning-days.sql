-- Repair ONLY the Weekly Planning `days` master list (Mon–Fri school week).
-- Run manually in Supabase SQL Editor.

INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('days', 'اليوم', 'Day')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;

INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الاثنين', 'Monday', 1, '{"workbook_value":"الاثنين / Monday","day_index":1}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'days'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;

INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الثلاثاء', 'Tuesday', 2, '{"workbook_value":"الثلاثاء / Tuesday","day_index":2}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'days'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;

INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الأربعاء', 'Wednesday', 3, '{"workbook_value":"الأربعاء / Wednesday","day_index":3}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'days'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;

INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الخميس', 'Thursday', 4, '{"workbook_value":"الخميس / Thursday","day_index":4}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'days'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;

INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الجمعة', 'Friday', 5, '{"workbook_value":"الجمعة / Friday","day_index":5}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'days'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;

-- Deactivate any extra legacy day rows beyond the official Mon–Fri list.
UPDATE public.weekly_plan_master_list_items items
SET is_active = false
FROM public.weekly_plan_master_lists lists
WHERE items.list_id = lists.id
  AND lists.list_key = 'days'
  AND items.sort_order > 5;
