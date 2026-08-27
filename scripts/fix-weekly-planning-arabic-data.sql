-- Manual fix for corrupted weekly planning master data (run in Supabase SQL Editor)
-- Generated from src/lib/weekly-planning-master-data.ts

-- Weekly planning master list seed (generated from workbook audit)

INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('domains', 'المحاور', 'Domains')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - القرآن الكريم', 'Divine Revelation - Holy Qur''an', 1, '{"workbook_value":"الوحي الإلهي - القرآن الكريم / Divine Revelation - Holy Qur''an"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'domains'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - الحديث الشريف', 'Divine Revelation - Prophetic Hadith', 2, '{"workbook_value":"الوحي الإلهي - الحديث الشريف / Divine Revelation - Prophetic Hadith"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'domains'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'العقيدة الإسلامية', 'Islamic Creed', 3, '{"workbook_value":"العقيدة الإسلامية / Islamic Creed"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'domains'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'قيم الإسلام وآدابه', 'Islamic Values and Manners', 4, '{"workbook_value":"قيم الإسلام وآدابه / Islamic Values and Manners"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'domains'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'أحكام الإسلام ومقاصده', 'Islamic Rulings and Objectives', 5, '{"workbook_value":"أحكام الإسلام ومقاصده / Islamic Rulings and Objectives"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'domains'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'السيرة والشخصيات', 'Prophetic Biography and Personalities', 6, '{"workbook_value":"السيرة والشخصيات / Prophetic Biography and Personalities"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'domains'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الهوية والقضايا المعاصرة', 'Identity and Contemporary Issues', 7, '{"workbook_value":"الهوية والقضايا المعاصرة / Identity and Contemporary Issues"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'domains'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('phases', 'المرحلة', 'Phase')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'رياض الأطفال', 'KG', 1, '{"workbook_value":"رياض الأطفال / KG","phase_slug":"kindergarten"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'phases'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'المرحلة الابتدائية', 'Elementary', 2, '{"workbook_value":"المرحلة الابتدائية / Elementary","phase_slug":"elementary"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'phases'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'المرحلة المتوسطة', 'Middle', 3, '{"workbook_value":"المرحلة المتوسطة / Middle","phase_slug":"middle"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'phases'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'المرحلة الثانوية', 'High', 4, '{"workbook_value":"المرحلة الثانوية / High","phase_slug":"high"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'phases'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('grades', 'الصف', 'Grade')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الروضة الأولى', 'KG1', 1, '{"workbook_value":"الروضة الأولى / KG1","grade_slug":"kg1","phase_slug":"kindergarten"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الروضة الثانية', 'KG2', 2, '{"workbook_value":"الروضة الثانية / KG2","grade_slug":"kg2","phase_slug":"kindergarten"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف الأول', 'Grade 1', 3, '{"workbook_value":"الصف الأول / Grade 1","grade_slug":"1","phase_slug":"elementary"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف الثاني', 'Grade 2', 4, '{"workbook_value":"الصف الثاني / Grade 2","grade_slug":"2","phase_slug":"elementary"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف الثالث', 'Grade 3', 5, '{"workbook_value":"الصف الثالث / Grade 3","grade_slug":"3","phase_slug":"elementary"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف الرابع', 'Grade 4', 6, '{"workbook_value":"الصف الرابع / Grade 4","grade_slug":"4","phase_slug":"elementary"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف الخامس', 'Grade 5', 7, '{"workbook_value":"الصف الخامس / Grade 5","grade_slug":"5","phase_slug":"elementary"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف السادس', 'Grade 6', 8, '{"workbook_value":"الصف السادس / Grade 6","grade_slug":"6","phase_slug":"middle"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف السابع', 'Grade 7', 9, '{"workbook_value":"الصف السابع / Grade 7","grade_slug":"7","phase_slug":"middle"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف الثامن', 'Grade 8', 10, '{"workbook_value":"الصف الثامن / Grade 8","grade_slug":"8","phase_slug":"middle"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف التاسع', 'Grade 9', 11, '{"workbook_value":"الصف التاسع / Grade 9","grade_slug":"9","phase_slug":"high"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف العاشر', 'Grade 10', 12, '{"workbook_value":"الصف العاشر / Grade 10","grade_slug":"10","phase_slug":"high"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف الحادي عشر', 'Grade 11', 13, '{"workbook_value":"الصف الحادي عشر / Grade 11","grade_slug":"11","phase_slug":"high"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الصف الثاني عشر', 'Grade 12', 14, '{"workbook_value":"الصف الثاني عشر / Grade 12","grade_slug":"12","phase_slug":"high"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'grades'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('sections', 'الشعبة', 'Section')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'A', 'A', 1, '{"workbook_value":"A"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sections'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'B', 'B', 2, '{"workbook_value":"B"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sections'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'C', 'C', 3, '{"workbook_value":"C"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sections'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'D', 'D', 4, '{"workbook_value":"D"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sections'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'E', 'E', 5, '{"workbook_value":"E"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sections'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'F', 'F', 6, '{"workbook_value":"F"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sections'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'G', 'G', 7, '{"workbook_value":"G"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sections'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'H', 'H', 8, '{"workbook_value":"H"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sections'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('days', 'اليوم', 'Day')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الأحد', 'Sunday', 1, '{"workbook_value":"الأحد / Sunday","day_index":0}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'days'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الاثنين', 'Monday', 2, '{"workbook_value":"الاثنين / Monday","day_index":1}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'days'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الثلاثاء', 'Tuesday', 3, '{"workbook_value":"الثلاثاء / Tuesday","day_index":2}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'days'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الأربعاء', 'Wednesday', 4, '{"workbook_value":"الأربعاء / Wednesday","day_index":3}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'days'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الخميس', 'Thursday', 5, '{"workbook_value":"الخميس / Thursday","day_index":4}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'days'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('p21_skills', 'مهارات القرن 21', '21st Century Skills')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'التفكير الناقد', 'Critical Thinking', 1, '{"workbook_value":"التفكير الناقد / Critical Thinking"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الإبداع', 'Creativity', 2, '{"workbook_value":"الإبداع / Creativity"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'التعاون', 'Collaboration', 3, '{"workbook_value":"التعاون / Collaboration"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'التواصل', 'Communication', 4, '{"workbook_value":"التواصل / Communication"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'حل المشكلات', 'Problem Solving', 5, '{"workbook_value":"حل المشكلات / Problem Solving"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'اتخاذ القرار', 'Decision Making', 6, '{"workbook_value":"اتخاذ القرار / Decision Making"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الابتكار', 'Innovation', 7, '{"workbook_value":"الابتكار / Innovation"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'التفكير التحليلي', 'Analytical Thinking', 8, '{"workbook_value":"التفكير التحليلي / Analytical Thinking"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'التعلم الذاتي', 'Self-Directed Learning', 9, '{"workbook_value":"التعلم الذاتي / Self-Directed Learning"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'المبادرة', 'Initiative', 10, '{"workbook_value":"المبادرة / Initiative"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'القيادة', 'Leadership', 11, '{"workbook_value":"القيادة / Leadership"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'المرونة والتكيف', 'Flexibility & Adaptability', 12, '{"workbook_value":"المرونة والتكيف / Flexibility & Adaptability"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الثقافة الرقمية', 'Digital Literacy', 13, '{"workbook_value":"الثقافة الرقمية / Digital Literacy"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الثقافة المعلوماتية', 'Information Literacy', 14, '{"workbook_value":"الثقافة المعلوماتية / Information Literacy"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الثقافة الإعلامية', 'Media Literacy', 15, '{"workbook_value":"الثقافة الإعلامية / Media Literacy"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الإنتاجية والمساءلة', 'Productivity & Accountability', 16, '{"workbook_value":"الإنتاجية والمساءلة / Productivity & Accountability"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'المهارات الاجتماعية والثقافية', 'Social & Cross-Cultural Skills', 17, '{"workbook_value":"المهارات الاجتماعية والثقافية / Social & Cross-Cultural Skills"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'p21_skills'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('sir_methods', 'طريقة SIR', 'SIR Method')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'ذاتي', 'Self', 1, '{"workbook_value":"ذاتي / Self"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sir_methods'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الأقران', 'Peer', 2, '{"workbook_value":"الأقران / Peer"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sir_methods'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'المعلم', 'Teacher', 3, '{"workbook_value":"المعلم / Teacher"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sir_methods'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'تأمل', 'Reflection', 4, '{"workbook_value":"تأمل / Reflection"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'sir_methods'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('units', 'الوحدة', 'Unit')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحدة الأولى', 'Unit 1', 1, '{"workbook_value":"الوحدة الأولى / Unit 1"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'units'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحدة الثانية', 'Unit 2', 2, '{"workbook_value":"الوحدة الثانية / Unit 2"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'units'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحدة الثالثة', 'Unit 3', 3, '{"workbook_value":"الوحدة الثالثة / Unit 3"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'units'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحدة الرابعة', 'Unit 4', 4, '{"workbook_value":"الوحدة الرابعة / Unit 4"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'units'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحدة الخامسة', 'Unit 5', 5, '{"workbook_value":"الوحدة الخامسة / Unit 5"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'units'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحدة السادسة', 'Unit 6', 6, '{"workbook_value":"الوحدة السادسة / Unit 6"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'units'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحدة السابعة', 'Unit 7', 7, '{"workbook_value":"الوحدة السابعة / Unit 7"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'units'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحدة الثامنة', 'Unit 8', 8, '{"workbook_value":"الوحدة الثامنة / Unit 8"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'units'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحدة التاسعة', 'Unit 9', 9, '{"workbook_value":"الوحدة التاسعة / Unit 9"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'units'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحدة العاشرة', 'Unit 10', 10, '{"workbook_value":"الوحدة العاشرة / Unit 10"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'units'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('success_criteria', 'معايير النجاح (HOTS)', 'Success Criteria (HOTS)')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - القرآن الكريم | يُحلّل الطالب أداءه في التلاوة، ويُصحّح الأخطاء بما يحقق القراءة الصحيحة للآيات.', 'Divine Revelation - Holy Qur''an | The student analyzes recitation performance and corrects errors to achieve accurate Qur''anic reading.', 1, '{"workbook_value":"الوحي الإلهي - القرآن الكريم | يُحلّل الطالب أداءه في التلاوة، ويُصحّح الأخطاء بما يحقق القراءة الصحيحة للآيات. / Divine Revelation - Holy Qur''an | The student analyzes recitation performance and corrects errors to achieve accurate Qur''anic reading.","domain_prefix_ar":"الوحي الإلهي - القرآن الكريم","domain_prefix_en":"Divine Revelation - Holy Qur''an"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - القرآن الكريم | يُطبّق الطالب أحكام التجويد في مواضعها، ويُبرّر سبب تطبيق الحكم في الآيات.', 'Divine Revelation - Holy Qur''an | The student applies Tajweed rules accurately and justifies why each rule is used in the verses.', 2, '{"workbook_value":"الوحي الإلهي - القرآن الكريم | يُطبّق الطالب أحكام التجويد في مواضعها، ويُبرّر سبب تطبيق الحكم في الآيات. / Divine Revelation - Holy Qur''an | The student applies Tajweed rules accurately and justifies why each rule is used in the verses.","domain_prefix_ar":"الوحي الإلهي - القرآن الكريم","domain_prefix_en":"Divine Revelation - Holy Qur''an"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - القرآن الكريم | يستظهر الطالب الآيات المقررة بدقة، ويُوظّف الحفظ في تفسير المعنى والاستدلال.', 'Divine Revelation - Holy Qur''an | The student memorizes the assigned verses accurately and uses memorization to explain meaning and support reasoning.', 3, '{"workbook_value":"الوحي الإلهي - القرآن الكريم | يستظهر الطالب الآيات المقررة بدقة، ويُوظّف الحفظ في تفسير المعنى والاستدلال. / Divine Revelation - Holy Qur''an | The student memorizes the assigned verses accurately and uses memorization to explain meaning and support reasoning.","domain_prefix_ar":"الوحي الإلهي - القرآن الكريم","domain_prefix_en":"Divine Revelation - Holy Qur''an"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - القرآن الكريم | يُفسّر الطالب الآيات في ضوء سياقها، ويستنتج الأفكار الرئيسة والمعاني الدالة عليها.', 'Divine Revelation - Holy Qur''an | The student interprets verses in context and infers their main ideas and significant meanings.', 4, '{"workbook_value":"الوحي الإلهي - القرآن الكريم | يُفسّر الطالب الآيات في ضوء سياقها، ويستنتج الأفكار الرئيسة والمعاني الدالة عليها. / Divine Revelation - Holy Qur''an | The student interprets verses in context and infers their main ideas and significant meanings.","domain_prefix_ar":"الوحي الإلهي - القرآن الكريم","domain_prefix_en":"Divine Revelation - Holy Qur''an"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - القرآن الكريم | يستنبط الطالب الهدايات والقيم من الآيات، ويُقيّم كيفية تطبيقها في مواقف حياتية معاصرة.', 'Divine Revelation - Holy Qur''an | The student derives guidance and values from the verses and evaluates how to apply them in contemporary life situations.', 5, '{"workbook_value":"الوحي الإلهي - القرآن الكريم | يستنبط الطالب الهدايات والقيم من الآيات، ويُقيّم كيفية تطبيقها في مواقف حياتية معاصرة. / Divine Revelation - Holy Qur''an | The student derives guidance and values from the verses and evaluates how to apply them in contemporary life situations.","domain_prefix_ar":"الوحي الإلهي - القرآن الكريم","domain_prefix_en":"Divine Revelation - Holy Qur''an"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - الحديث الشريف | يقرأ الطالب الحديث قراءة صحيحة، ثم يُحلّل ألفاظه وسياقه ليشرح معناه العام بأسلوبه.', 'Divine Revelation - Prophetic Hadith | The student reads the Hadith accurately, analyzes its wording and context, and explains its overall meaning in their own words.', 6, '{"workbook_value":"الوحي الإلهي - الحديث الشريف | يقرأ الطالب الحديث قراءة صحيحة، ثم يُحلّل ألفاظه وسياقه ليشرح معناه العام بأسلوبه. / Divine Revelation - Prophetic Hadith | The student reads the Hadith accurately, analyzes its wording and context, and explains its overall meaning in their own words.","domain_prefix_ar":"الوحي الإلهي - الحديث الشريف","domain_prefix_en":"Divine Revelation - Prophetic Hadith"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - الحديث الشريف | يستنتج الطالب القيم والتوجيهات الواردة في الحديث، ويُبرّر استنتاجاته بأدلة من النص.', 'Divine Revelation - Prophetic Hadith | The student infers values and guidance from the Hadith and justifies conclusions with evidence from the text.', 7, '{"workbook_value":"الوحي الإلهي - الحديث الشريف | يستنتج الطالب القيم والتوجيهات الواردة في الحديث، ويُبرّر استنتاجاته بأدلة من النص. / Divine Revelation - Prophetic Hadith | The student infers values and guidance from the Hadith and justifies conclusions with evidence from the text.","domain_prefix_ar":"الوحي الإلهي - الحديث الشريف","domain_prefix_en":"Divine Revelation - Prophetic Hadith"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - الحديث الشريف | يُقارن الطالب بين مواقف حياتية مختلفة في ضوء توجيهات الحديث الشريف.', 'Divine Revelation - Prophetic Hadith | The student compares different life situations in light of the guidance of the Hadith.', 8, '{"workbook_value":"الوحي الإلهي - الحديث الشريف | يُقارن الطالب بين مواقف حياتية مختلفة في ضوء توجيهات الحديث الشريف. / Divine Revelation - Prophetic Hadith | The student compares different life situations in light of the guidance of the Hadith.","domain_prefix_ar":"الوحي الإلهي - الحديث الشريف","domain_prefix_en":"Divine Revelation - Prophetic Hadith"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - الحديث الشريف | يُقيّم الطالب سلوكًا أو موقفًا معاصرًا وفق ما يرشد إليه الحديث، ويُبرّر حكمه.', 'Divine Revelation - Prophetic Hadith | The student evaluates a contemporary behavior or situation using the guidance of the Hadith and justifies the judgment.', 9, '{"workbook_value":"الوحي الإلهي - الحديث الشريف | يُقيّم الطالب سلوكًا أو موقفًا معاصرًا وفق ما يرشد إليه الحديث، ويُبرّر حكمه. / Divine Revelation - Prophetic Hadith | The student evaluates a contemporary behavior or situation using the guidance of the Hadith and justifies the judgment.","domain_prefix_ar":"الوحي الإلهي - الحديث الشريف","domain_prefix_en":"Divine Revelation - Prophetic Hadith"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الوحي الإلهي - الحديث الشريف | يُصمّم الطالب تطبيقًا عمليًا يحوّل قيمة من قيم الحديث إلى ممارسة في حياته اليومية.', 'Divine Revelation - Prophetic Hadith | The student designs a practical application that turns a value from the Hadith into daily practice.', 10, '{"workbook_value":"الوحي الإلهي - الحديث الشريف | يُصمّم الطالب تطبيقًا عمليًا يحوّل قيمة من قيم الحديث إلى ممارسة في حياته اليومية. / Divine Revelation - Prophetic Hadith | The student designs a practical application that turns a value from the Hadith into daily practice.","domain_prefix_ar":"الوحي الإلهي - الحديث الشريف","domain_prefix_en":"Divine Revelation - Prophetic Hadith"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'العقيدة الإسلامية | يُحلّل الطالب أركان الإيمان، ويبيّن العلاقات بينها وأثرها في بناء التصور الإسلامي.', 'Islamic Creed | The student analyzes the pillars of faith, explains their connections, and evaluates their impact on an Islamic worldview.', 11, '{"workbook_value":"العقيدة الإسلامية | يُحلّل الطالب أركان الإيمان، ويبيّن العلاقات بينها وأثرها في بناء التصور الإسلامي. / Islamic Creed | The student analyzes the pillars of faith, explains their connections, and evaluates their impact on an Islamic worldview.","domain_prefix_ar":"العقيدة الإسلامية","domain_prefix_en":"Islamic Creed"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'العقيدة الإسلامية | يستدل الطالب على حقائق الإيمان بأدلة مناسبة، ويُبرّر صحة استدلاله.', 'Islamic Creed | The student supports truths of faith with appropriate evidence and justifies the validity of the reasoning.', 12, '{"workbook_value":"العقيدة الإسلامية | يستدل الطالب على حقائق الإيمان بأدلة مناسبة، ويُبرّر صحة استدلاله. / Islamic Creed | The student supports truths of faith with appropriate evidence and justifies the validity of the reasoning.","domain_prefix_ar":"العقيدة الإسلامية","domain_prefix_en":"Islamic Creed"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'العقيدة الإسلامية | يُقيّم الطالب أثر العقيدة في السلوك والطمأنينة وتحمل المسؤولية في مواقف واقعية.', 'Islamic Creed | The student evaluates the impact of faith on behavior, inner peace, and responsibility in real-life situations.', 13, '{"workbook_value":"العقيدة الإسلامية | يُقيّم الطالب أثر العقيدة في السلوك والطمأنينة وتحمل المسؤولية في مواقف واقعية. / Islamic Creed | The student evaluates the impact of faith on behavior, inner peace, and responsibility in real-life situations.","domain_prefix_ar":"العقيدة الإسلامية","domain_prefix_en":"Islamic Creed"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'العقيدة الإسلامية | ينقد الطالب مفهومًا خاطئًا مرتبطًا بالعقيدة، ويصححه بالحجة والاعتدال.', 'Islamic Creed | The student critiques a misconception related to faith and corrects it using evidence and moderation.', 14, '{"workbook_value":"العقيدة الإسلامية | ينقد الطالب مفهومًا خاطئًا مرتبطًا بالعقيدة، ويصححه بالحجة والاعتدال. / Islamic Creed | The student critiques a misconception related to faith and corrects it using evidence and moderation.","domain_prefix_ar":"العقيدة الإسلامية","domain_prefix_en":"Islamic Creed"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'العقيدة الإسلامية | يُوظّف الطالب مبادئ العقيدة في اتخاذ موقف متزن تجاه قضية حياتية أو فكرية.', 'Islamic Creed | The student applies principles of Islamic creed to form a balanced position on a life or intellectual issue.', 15, '{"workbook_value":"العقيدة الإسلامية | يُوظّف الطالب مبادئ العقيدة في اتخاذ موقف متزن تجاه قضية حياتية أو فكرية. / Islamic Creed | The student applies principles of Islamic creed to form a balanced position on a life or intellectual issue.","domain_prefix_ar":"العقيدة الإسلامية","domain_prefix_en":"Islamic Creed"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'قيم الإسلام وآدابه | يُحلّل الطالب مواقف حياتية لتحديد القيم الإسلامية الظاهرة فيها ومدى تحققها.', 'Islamic Values and Manners | The student analyzes life situations to identify the Islamic values present and judge the extent to which they are demonstrated.', 16, '{"workbook_value":"قيم الإسلام وآدابه | يُحلّل الطالب مواقف حياتية لتحديد القيم الإسلامية الظاهرة فيها ومدى تحققها. / Islamic Values and Manners | The student analyzes life situations to identify the Islamic values present and judge the extent to which they are demonstrated.","domain_prefix_ar":"قيم الإسلام وآدابه","domain_prefix_en":"Islamic Values and Manners"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'قيم الإسلام وآدابه | يُقارن الطالب بين بدائل سلوكية، ويُبرّر الاختيار الأكثر اتساقًا مع الصدق والأمانة والتسامح والرحمة والتعاون.', 'Islamic Values and Manners | The student compares behavioral alternatives and justifies the choice most consistent with honesty, trustworthiness, tolerance, mercy, and cooperation.', 17, '{"workbook_value":"قيم الإسلام وآدابه | يُقارن الطالب بين بدائل سلوكية، ويُبرّر الاختيار الأكثر اتساقًا مع الصدق والأمانة والتسامح والرحمة والتعاون. / Islamic Values and Manners | The student compares behavioral alternatives and justifies the choice most consistent with honesty, trustworthiness, tolerance, mercy, and cooperation.","domain_prefix_ar":"قيم الإسلام وآدابه","domain_prefix_en":"Islamic Values and Manners"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'قيم الإسلام وآدابه | يُقيّم الطالب سلوكًا في ضوء احترام الوالدين وكبار السن وأصحاب الثقافات المختلفة.', 'Islamic Values and Manners | The student evaluates behavior in light of respect for parents, elders, and people from different cultures.', 18, '{"workbook_value":"قيم الإسلام وآدابه | يُقيّم الطالب سلوكًا في ضوء احترام الوالدين وكبار السن وأصحاب الثقافات المختلفة. / Islamic Values and Manners | The student evaluates behavior in light of respect for parents, elders, and people from different cultures.","domain_prefix_ar":"قيم الإسلام وآدابه","domain_prefix_en":"Islamic Values and Manners"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'قيم الإسلام وآدابه | يُصمّم الطالب استجابة عملية تعكس المسؤولية والانضباط والإيجابية في موقف واقعي.', 'Islamic Values and Manners | The student designs a practical response that demonstrates responsibility, self-discipline, and positivity in a real-life situation.', 19, '{"workbook_value":"قيم الإسلام وآدابه | يُصمّم الطالب استجابة عملية تعكس المسؤولية والانضباط والإيجابية في موقف واقعي. / Islamic Values and Manners | The student designs a practical response that demonstrates responsibility, self-discipline, and positivity in a real-life situation.","domain_prefix_ar":"قيم الإسلام وآدابه","domain_prefix_en":"Islamic Values and Manners"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'قيم الإسلام وآدابه | يحوّل الطالب قيمة إسلامية إلى ممارسة أو مبادرة قابلة للتطبيق في حياته اليومية.', 'Islamic Values and Manners | The student transforms an Islamic value into a practical habit or initiative that can be applied in daily life.', 20, '{"workbook_value":"قيم الإسلام وآدابه | يحوّل الطالب قيمة إسلامية إلى ممارسة أو مبادرة قابلة للتطبيق في حياته اليومية. / Islamic Values and Manners | The student transforms an Islamic value into a practical habit or initiative that can be applied in daily life.","domain_prefix_ar":"قيم الإسلام وآدابه","domain_prefix_en":"Islamic Values and Manners"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'أحكام الإسلام ومقاصده | يُحلّل الطالب خطوات العبادة أو الحكم الشرعي، ويُميّز الأداء الصحيح من غير الصحيح.', 'Islamic Rulings and Objectives | The student analyzes the steps of an act of worship or a legal ruling and distinguishes correct from incorrect practice.', 21, '{"workbook_value":"أحكام الإسلام ومقاصده | يُحلّل الطالب خطوات العبادة أو الحكم الشرعي، ويُميّز الأداء الصحيح من غير الصحيح. / Islamic Rulings and Objectives | The student analyzes the steps of an act of worship or a legal ruling and distinguishes correct from incorrect practice.","domain_prefix_ar":"أحكام الإسلام ومقاصده","domain_prefix_en":"Islamic Rulings and Objectives"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'أحكام الإسلام ومقاصده | يُطبّق الطالب أحكام الطهارة والصلاة والصيام والزكاة والحج تطبيقًا صحيحًا في مواقف عملية.', 'Islamic Rulings and Objectives | The student accurately applies the rulings of purification, prayer, fasting, Zakat, and Hajj in practical situations.', 22, '{"workbook_value":"أحكام الإسلام ومقاصده | يُطبّق الطالب أحكام الطهارة والصلاة والصيام والزكاة والحج تطبيقًا صحيحًا في مواقف عملية. / Islamic Rulings and Objectives | The student accurately applies the rulings of purification, prayer, fasting, Zakat, and Hajj in practical situations.","domain_prefix_ar":"أحكام الإسلام ومقاصده","domain_prefix_en":"Islamic Rulings and Objectives"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'أحكام الإسلام ومقاصده | يستنتج الطالب مقاصد الشريعة من الأحكام، ويربطها بحفظ الدين والنفس والعقل والنسل والمال.', 'Islamic Rulings and Objectives | The student infers the objectives of Sharia from rulings and connects them to preserving religion, life, intellect, lineage, and wealth.', 23, '{"workbook_value":"أحكام الإسلام ومقاصده | يستنتج الطالب مقاصد الشريعة من الأحكام، ويربطها بحفظ الدين والنفس والعقل والنسل والمال. / Islamic Rulings and Objectives | The student infers the objectives of Sharia from rulings and connects them to preserving religion, life, intellect, lineage, and wealth.","domain_prefix_ar":"أحكام الإسلام ومقاصده","domain_prefix_en":"Islamic Rulings and Objectives"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'أحكام الإسلام ومقاصده | يُقيّم الطالب موقفًا معاصرًا في ضوء الحكم الشرعي ومقصده، ويُبرّر حكمه.', 'Islamic Rulings and Objectives | The student evaluates a contemporary situation in light of the relevant Islamic ruling and its objective, and justifies the judgment.', 24, '{"workbook_value":"أحكام الإسلام ومقاصده | يُقيّم الطالب موقفًا معاصرًا في ضوء الحكم الشرعي ومقصده، ويُبرّر حكمه. / Islamic Rulings and Objectives | The student evaluates a contemporary situation in light of the relevant Islamic ruling and its objective, and justifies the judgment.","domain_prefix_ar":"أحكام الإسلام ومقاصده","domain_prefix_en":"Islamic Rulings and Objectives"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'أحكام الإسلام ومقاصده | يُوظّف الطالب الأحكام والمقاصد الشرعية لاقتراح حل متزن لموقف معاصر.', 'Islamic Rulings and Objectives | The student applies Islamic rulings and objectives to propose a balanced solution to a contemporary situation.', 25, '{"workbook_value":"أحكام الإسلام ومقاصده | يُوظّف الطالب الأحكام والمقاصد الشرعية لاقتراح حل متزن لموقف معاصر. / Islamic Rulings and Objectives | The student applies Islamic rulings and objectives to propose a balanced solution to a contemporary situation.","domain_prefix_ar":"أحكام الإسلام ومقاصده","domain_prefix_en":"Islamic Rulings and Objectives"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'السيرة والشخصيات | يُحلّل الطالب موقفًا من السيرة النبوية، ويستنتج دوافعه ونتائجه ودروسه.', 'Prophetic Biography and Personalities | The student analyzes an event from the Prophetic biography and infers its motives, outcomes, and lessons.', 26, '{"workbook_value":"السيرة والشخصيات | يُحلّل الطالب موقفًا من السيرة النبوية، ويستنتج دوافعه ونتائجه ودروسه. / Prophetic Biography and Personalities | The student analyzes an event from the Prophetic biography and infers its motives, outcomes, and lessons.","domain_prefix_ar":"السيرة والشخصيات","domain_prefix_en":"Prophetic Biography and Personalities"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'السيرة والشخصيات | يُقارن الطالب بين مواقف للرسول ﷺ والصحابة والشخصيات الإسلامية المؤثرة، ويستخلص السمات القيادية والأخلاقية.', 'Prophetic Biography and Personalities | The student compares situations involving the Prophet ﷺ, the Companions, and influential Muslim figures and derives leadership and moral qualities.', 27, '{"workbook_value":"السيرة والشخصيات | يُقارن الطالب بين مواقف للرسول ﷺ والصحابة والشخصيات الإسلامية المؤثرة، ويستخلص السمات القيادية والأخلاقية. / Prophetic Biography and Personalities | The student compares situations involving the Prophet ﷺ, the Companions, and influential Muslim figures and derives leadership and moral qualities.","domain_prefix_ar":"السيرة والشخصيات","domain_prefix_en":"Prophetic Biography and Personalities"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'السيرة والشخصيات | يُقيّم الطالب قرارًا أو موقفًا تاريخيًا في ضوء القيم والمبادئ الإسلامية.', 'Prophetic Biography and Personalities | The student evaluates a historical decision or situation in light of Islamic values and principles.', 28, '{"workbook_value":"السيرة والشخصيات | يُقيّم الطالب قرارًا أو موقفًا تاريخيًا في ضوء القيم والمبادئ الإسلامية. / Prophetic Biography and Personalities | The student evaluates a historical decision or situation in light of Islamic values and principles.","domain_prefix_ar":"السيرة والشخصيات","domain_prefix_en":"Prophetic Biography and Personalities"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'السيرة والشخصيات | يستنتج الطالب الدروس القيادية والأخلاقية من السيرة، ويُبرّرها بالشواهد.', 'Prophetic Biography and Personalities | The student derives leadership and ethical lessons from the Seerah and justifies them with evidence.', 29, '{"workbook_value":"السيرة والشخصيات | يستنتج الطالب الدروس القيادية والأخلاقية من السيرة، ويُبرّرها بالشواهد. / Prophetic Biography and Personalities | The student derives leadership and ethical lessons from the Seerah and justifies them with evidence.","domain_prefix_ar":"السيرة والشخصيات","domain_prefix_en":"Prophetic Biography and Personalities"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'السيرة والشخصيات | يُوظّف الطالب درسًا مستفادًا من السيرة أو الشخصيات الإسلامية في موقف من حياته اليومية.', 'Prophetic Biography and Personalities | The student applies a lesson from the Seerah or Islamic personalities to a situation in daily life.', 30, '{"workbook_value":"السيرة والشخصيات | يُوظّف الطالب درسًا مستفادًا من السيرة أو الشخصيات الإسلامية في موقف من حياته اليومية. / Prophetic Biography and Personalities | The student applies a lesson from the Seerah or Islamic personalities to a situation in daily life.","domain_prefix_ar":"السيرة والشخصيات","domain_prefix_en":"Prophetic Biography and Personalities"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الهوية والقضايا المعاصرة | يُحلّل الطالب عناصر الهوية الإسلامية والوطنية، ويبيّن أثرها في السلوك والانتماء.', 'Identity and Contemporary Issues | The student analyzes elements of Islamic and national identity and explains their impact on behavior and belonging.', 31, '{"workbook_value":"الهوية والقضايا المعاصرة | يُحلّل الطالب عناصر الهوية الإسلامية والوطنية، ويبيّن أثرها في السلوك والانتماء. / Identity and Contemporary Issues | The student analyzes elements of Islamic and national identity and explains their impact on behavior and belonging.","domain_prefix_ar":"الهوية والقضايا المعاصرة","domain_prefix_en":"Identity and Contemporary Issues"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الهوية والقضايا المعاصرة | يُقيّم الطالب مواقف تعكس الولاء والانتماء لدولة الإمارات وقيادتها، ويُبرّر حكمه.', 'Identity and Contemporary Issues | The student evaluates situations that reflect loyalty and belonging to the UAE and its leadership and justifies the judgment.', 32, '{"workbook_value":"الهوية والقضايا المعاصرة | يُقيّم الطالب مواقف تعكس الولاء والانتماء لدولة الإمارات وقيادتها، ويُبرّر حكمه. / Identity and Contemporary Issues | The student evaluates situations that reflect loyalty and belonging to the UAE and its leadership and justifies the judgment.","domain_prefix_ar":"الهوية والقضايا المعاصرة","domain_prefix_en":"Identity and Contemporary Issues"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الهوية والقضايا المعاصرة | يُقارن الطالب بين استجابات مختلفة لقضية معاصرة في ضوء الوسطية والاعتدال والتسامح والتعايش.', 'Identity and Contemporary Issues | The student compares different responses to a contemporary issue in light of moderation, tolerance, and coexistence.', 33, '{"workbook_value":"الهوية والقضايا المعاصرة | يُقارن الطالب بين استجابات مختلفة لقضية معاصرة في ضوء الوسطية والاعتدال والتسامح والتعايش. / Identity and Contemporary Issues | The student compares different responses to a contemporary issue in light of moderation, tolerance, and coexistence.","domain_prefix_ar":"الهوية والقضايا المعاصرة","domain_prefix_en":"Identity and Contemporary Issues"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الهوية والقضايا المعاصرة | يُحلّل الطالب قضية اجتماعية أو رقمية أو بيئية، ويقترح تعاملًا واعيًا ومسؤولًا معها.', 'Identity and Contemporary Issues | The student analyzes a social, digital, or environmental issue and proposes a conscious and responsible response.', 34, '{"workbook_value":"الهوية والقضايا المعاصرة | يُحلّل الطالب قضية اجتماعية أو رقمية أو بيئية، ويقترح تعاملًا واعيًا ومسؤولًا معها. / Identity and Contemporary Issues | The student analyzes a social, digital, or environmental issue and proposes a conscious and responsible response.","domain_prefix_ar":"الهوية والقضايا المعاصرة","domain_prefix_en":"Identity and Contemporary Issues"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'الهوية والقضايا المعاصرة | ينقد الطالب مظاهر التطرف والكراهية والتمييز، ويُبرّر رفضها في ضوء القيم الإسلامية.', 'Identity and Contemporary Issues | The student critiques manifestations of extremism, hatred, and discrimination and justifies rejecting them in light of Islamic values.', 35, '{"workbook_value":"الهوية والقضايا المعاصرة | ينقد الطالب مظاهر التطرف والكراهية والتمييز، ويُبرّر رفضها في ضوء القيم الإسلامية. / Identity and Contemporary Issues | The student critiques manifestations of extremism, hatred, and discrimination and justifies rejecting them in light of Islamic values.","domain_prefix_ar":"الهوية والقضايا المعاصرة","domain_prefix_en":"Identity and Contemporary Issues"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'success_criteria'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;


INSERT INTO public.weekly_plan_master_lists (list_key, label_ar, label_en)
VALUES ('subjects', 'المادة', 'Subject')
ON CONFLICT (list_key) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en;


INSERT INTO public.weekly_plan_master_list_items (list_id, label_ar, label_en, sort_order, metadata)
SELECT id, 'التربية الإسلامية', 'Islamic Education', 1, '{"workbook_value":"التربية الإسلامية / Islamic Education"}'::jsonb
FROM public.weekly_plan_master_lists
WHERE list_key = 'subjects'
ON CONFLICT (list_id, sort_order) DO UPDATE
  SET label_ar = EXCLUDED.label_ar,
      label_en = EXCLUDED.label_en,
      metadata = EXCLUDED.metadata,
      is_active = true;

-- Optional: fix plans saved with corrupted subject default
UPDATE public.weekly_plans
SET subject = 'التربية الإسلامية / Islamic Education'
WHERE subject LIKE '%?%'
   OR subject LIKE '%\ufffd%';
