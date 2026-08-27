import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Bi } from "@/lib/curriculum";
import { supabase } from "@/integrations/supabase/client";
import {
  LANG_STORAGE_KEY,
  contentLocale,
  isLang,
  isRtlLang,
  langDir,
  pickBiLocale,
  type ContentLocale,
  type Lang,
} from "@/lib/i18n-config";
import {
  applyLanguageForUser,
  persistLanguage,
  resolveGuestLanguage,
  savePreferredLanguage,
} from "@/lib/preferred-language";
import { de } from "@/lib/i18n/locales/de";
import { fr } from "@/lib/i18n/locales/fr";
import { ur } from "@/lib/i18n/locales/ur";
import { zh } from "@/lib/i18n/locales/zh";
import {
  getCachedEducationalTranslation,
} from "@/lib/translation-cache";
import {
  educationalDisplayFallback,
  hasSuccessfulEducationalTranslations,
  initEducationalTranslationScheduler,
  needsDynamicTranslation,
  onTranslationAvailabilityChange,
  resetTranslationSession,
  resolveStoredBiText,
  biPendingDisplayText,
  biSourceForTranslation,
  translateEducationalContent,
  type EducationalContentType,
} from "@/lib/translate-content";

export type { Lang, ContentLocale } from "@/lib/i18n-config";
export { L, LANG_OPTIONS, pickBi, pickBiLocale, uiBi } from "@/lib/i18n-config";
export {
  translateEducationalContent,
  translateEducationalBi,
  prefetchEducationalTranslations,
  needsDynamicTranslation,
  isTranslationServiceAvailable,
  resetTranslationSession,
  type EducationalContentType,
  type EducationalField,
} from "@/lib/translate-content";
// Backward-compatible aliases
export {
  translateEducationalContent as translateContent,
  translateEducationalBi as translateBi,
  prefetchEducationalTranslations as prefetchTranslations,
} from "@/lib/translate-content";

type Dict = Record<string, { en: string; ar: string }>;

export const t = {
  // Nav
  nav_home: { en: "Home", ar: "الرئيسية" },
  nav_about: { en: "About", ar: "عن الأكاديمية" },
  nav_student: { en: "Student Portal", ar: "بوابة الطالب" },
  nav_parent: { en: "Parent Corner", ar: "ركن الوالدين" },
  nav_stages: { en: "Academic Stages", ar: "المراحل الدراسية" },
  nav_resources: { en: "Resources", ar: "المكتبة" },
  nav_videos: { en: "Videos", ar: "الدروس المرئية" },
  nav_quizzes: { en: "Quizzes", ar: "الاختبارات" },
  nav_assignments: { en: "Assignments", ar: "الواجبات" },
  nav_notifications: { en: "Notifications", ar: "الإشعارات" },
  nav_announcements: { en: "Announcements", ar: "الإعلانات" },
  nav_hall_of_fame: { en: "Hall of Fame", ar: "لوحة الشرف" },
  nav_contact: { en: "Contact", ar: "اتصل بنا" },
  nav_login: { en: "Student Login", ar: "دخول الطالب" },

  // Brand
  brand_name: { en: "Ignite Islamic Academy", ar: "أكاديمية اجنايت الإسلامية" },
  brand_org: {
    en: "Department of Islamic Education – Ignite School",
    ar: "قسم التربية الإسلامية – مدرسة اجنايت",
  },
  school_logo_alt: { en: "Ignite School", ar: "مدرسة اجنايت" },
  tagline: { en: "Igniting Knowledge, Faith, and Character", ar: "نُشعل المعرفة والإيمان والأخلاق" },

  // Hero
  hero_badge: { en: "Online Islamic Education · KG1 to Grade 12", ar: "تعليم إسلامي عبر الإنترنت · من الروضة إلى الصف الثاني عشر" },
  hero_subtitle: {
    en: "Department of Islamic Education – Ignite School",
    ar: "قسم التربية الإسلامية – مدرسة اجنايت",
  },
  hero_desc: {
    en: "A modern platform for students, parents, and teachers — bringing classical Islamic Studies to life with beautiful lessons, videos, worksheets, and interactive assessments.",
    ar: "منصة عصرية للطلاب وأولياء الأمور والمعلمين، تُحيي الدراسات الإسلامية الأصيلة من خلال دروس راقية ومقاطع فيديو وأوراق عمل وتقييمات تفاعلية.",
  },
  cta_start: { en: "Start Learning", ar: "ابدأ التعلّم" },
  cta_watch: { en: "Watch Intro", ar: "شاهد المقدمة" },
  cta_signup: { en: "Create Student Account", ar: "إنشاء حساب طالب" },
  cta_login: { en: "Login", ar: "تسجيل الدخول" },
  cta_explore: { en: "Explore Academy", ar: "استكشف الأكاديمية" },

  stat_lessons: { en: "Lessons", ar: "الدروس" },
  stat_grades: { en: "Grade Levels", ar: "الصفوف الدراسية" },
  stat_subjects: { en: "Subjects", ar: "المواد" },
  stat_worksheets: { en: "Educational Files", ar: "الملفات التعليمية" },
  stat_educational_files: { en: "Educational Files", ar: "الملفات التعليمية" },
  stat_students: { en: "Students", ar: "الطلاب" },
  stat_assessments: { en: "Quizzes", ar: "الاختبارات" },
  stat_videos: { en: "Videos", ar: "الفيديوهات" },
  questions: { en: "Questions", ar: "أسئلة" },

  badge_certified: { en: "Certified Curriculum", ar: "منهج معتمد" },
  badge_certified_sub: { en: "Aligned with international standards", ar: "متوافق مع المعايير الدولية" },

  // Stages section
  stages_eyebrow: { en: "Academic Stages", ar: "المراحل الدراسية" },
  stages_title: { en: "Find your learning path", ar: "اختر مسار تعلّمك" },
  stages_desc: { en: "From first letters to final exams — a structured journey through every grade.", ar: "من الحروف الأولى إلى الاختبارات النهائية — رحلة منظَّمة عبر كل صف." },
  stage_kg: { en: "Kindergarten", ar: "رياض الأطفال" },
  stage_kg_subtitle: { en: "Planting values · building hearts", ar: "غرس القيم .. وبناء القلوب" },
  stage_kg_grades: { en: "KG1 – KG2", ar: "روضة 1 – روضة 2" },
  stage_elem: { en: "Elementary", ar: "المرحلة الابتدائية" },
  stage_elem_subtitle: { en: "We learn to understand · we apply to master", ar: "نتعلم لنفهم .. ونطبق لنتقن" },
  stage_elem_grades: { en: "Grade 1 – 5", ar: "الصف 1 – 5" },
  stage_mid: { en: "Middle School", ar: "المرحلة المتوسطة" },
  stage_mid_subtitle: { en: "We strengthen our identity · we live our values", ar: "نعزز هويتنا .. ونطبق قيمنا" },
  stage_mid_grades: { en: "Grade 6 – 8", ar: "الصف 6 – 8" },
  stage_high: { en: "High School", ar: "المرحلة الثانوية" },
  stage_high_subtitle: { en: "We lead our future · we make an impact", ar: "نقود مستقبلنا .. نصنع الأثر" },
  stage_high_grades: { en: "Grade 9 – 12", ar: "الصف 9 – 12" },
  explore: { en: "Explore", ar: "استكشف" },

  // Categories
  cat_eyebrow: { en: "Islamic Studies", ar: "الدراسات الإسلامية" },
  cat_title: { en: "Eight pillars of our curriculum", ar: "ثمانية أركان لمنهجنا" },
  cat_desc: { en: "A balanced study of revelation, practice, history, and character.", ar: "دراسة متوازنة للوحي والعبادة والتاريخ والأخلاق." },
  cat_quran: { en: "Quran", ar: "القرآن الكريم" },
  cat_quran_d: { en: "Recitation, Tajweed & Tafsir", ar: "التلاوة والتجويد والتفسير" },
  cat_hadith: { en: "Hadith", ar: "الحديث الشريف" },
  cat_hadith_d: { en: "Sayings of the Prophet ﷺ", ar: "أحاديث النبي ﷺ" },
  cat_aqeedah: { en: "Aqeedah", ar: "العقيدة" },
  cat_aqeedah_d: { en: "Foundations of Faith", ar: "أصول الإيمان" },
  cat_fiqh: { en: "Fiqh", ar: "الفقه" },
  cat_fiqh_d: { en: "Islamic Jurisprudence", ar: "أحكام الشريعة الإسلامية" },
  cat_seerah: { en: "Seerah", ar: "السيرة النبوية" },
  cat_seerah_d: { en: "The Prophetic Biography", ar: "سيرة النبي ﷺ" },
  cat_values: { en: "Islamic Values", ar: "القيم الإسلامية" },
  cat_values_d: { en: "Akhlaq & Manners", ar: "الأخلاق والآداب" },
  cat_etiquette: { en: "Islamic Etiquette", ar: "الآداب الإسلامية" },
  cat_etiquette_d: { en: "Adab in Daily Life", ar: "الآداب في الحياة اليومية" },
  cat_contemp: { en: "Contemporary Issues", ar: "القضايا المعاصرة" },
  cat_contemp_d: { en: "Islam in the Modern World", ar: "الإسلام في العالم المعاصر" },

  // Lessons
  lessons_eyebrow: { en: "Latest Lessons", ar: "أحدث الدروس" },
  lessons_title: { en: "Fresh from the classroom", ar: "جديد من الفصل الدراسي" },
  lesson_1_title: { en: "The Pillars of Iman", ar: "أركان الإيمان" },
  lesson_1_unit: { en: "Aqeedah · Unit 2", ar: "العقيدة · الوحدة 2" },
  lesson_2_title: { en: "Stories of the Prophets", ar: "قصص الأنبياء" },
  lesson_2_unit: { en: "Seerah · Unit 4", ar: "السيرة · الوحدة 4" },
  lesson_3_title: { en: "Ethics of Wealth in Islam", ar: "أخلاقيات المال في الإسلام" },
  lesson_3_unit: { en: "Fiqh · Unit 6", ar: "الفقه · الوحدة 6" },
  grade_5: { en: "Grade 5", ar: "الصف الخامس" },
  grade_8: { en: "Grade 8", ar: "الصف الثامن" },
  grade_11: { en: "Grade 11", ar: "الصف الحادي عشر" },
  lesson_meta: { en: "Includes worksheet & quiz", ar: "يتضمن ورقة عمل واختبار" },
  minutes: { en: "min", ar: "دقيقة" },
  progress_lessons_pct: { en: "{pct}% of lessons completed", ar: "{pct}% من الدروس مكتملة" },

  // Announcements
  ann_eyebrow: { en: "Announcements", ar: "الإعلانات" },
  ann_title: { en: "What's new", ar: "آخر المستجدات" },
  ann_subtitle: {
    en: "Official school updates for students, parents, and staff — news, exams, events, and announcements.",
    ar: "آخر المستجدات الرسمية للطلاب وأولياء الأمور — أخبار المدرسة والاختبارات والفعاليات.",
  },
  ann_view_all: { en: "View all announcements", ar: "عرض جميع الإعلانات" },
  ann_school: { en: "School News", ar: "أخبار المدرسة" },
  ann_1: { en: "Mid-Term Assessment Schedule Published", ar: "نشر جدول الاختبارات النصفية" },
  ann_2: { en: "Annual Quran Recitation Competition", ar: "المسابقة السنوية لتلاوة القرآن الكريم" },
  ann_3: { en: "New Hadith Curriculum Launched for Grade 7", ar: "إطلاق منهج الحديث الجديد للصف السابع" },
  tag_exam: { en: "Exam", ar: "اختبار" },
  tag_event: { en: "Event", ar: "فعالية" },
  tag_news: { en: "News", ar: "خبر" },

  // Features
  feat_eyebrow: { en: "Everything you need", ar: "كل ما تحتاجه" },
  feat_title: { en: "A complete learning ecosystem", ar: "منظومة تعليمية متكاملة" },
  feat_desc: { en: "Built for students, parents, and teachers — beautiful on every device.", ar: "مصممة للطلاب وأولياء الأمور والمعلمين — بتجربة راقية على كل جهاز." },
  feat_lib_t: { en: "Resource Library", ar: "المكتبة التعليمية" },
  feat_lib_d: { en: "PDFs, worksheets, revisions, past papers — searchable by grade.", ar: "ملفات PDF وأوراق عمل ومراجعات وأسئلة سابقة — قابلة للبحث حسب الصف." },
  feat_vid_t: { en: "Video Lessons", ar: "الدروس المرئية" },
  feat_vid_d: { en: "Engaging video curriculum, organized by unit and grade.", ar: "منهج فيديو شيّق منظَّم حسب الوحدة والصف." },
  feat_quiz_t: { en: "Online Quizzes", ar: "الاختبارات الإلكترونية" },
  feat_quiz_d: { en: "MCQ, true/false, matching — with instant feedback.", ar: "اختيار من متعدد وصح/خطأ وتوصيل — مع تغذية راجعة فورية." },
  feat_par_t: { en: "Parent Corner", ar: "ركن الوالدين" },
  feat_par_d: { en: "Guides, exam info, FAQs and important dates in one place.", ar: "أدلة ومعلومات الاختبارات والأسئلة الشائعة والتواريخ المهمة في مكان واحد." },

  // Parent / Student CTA
  for_parents: { en: "For Parents", ar: "لأولياء الأمور" },
  for_parents_d: { en: "Track progress, find study tips, and stay updated with school announcements.", ar: "تابعوا التقدم، واطلعوا على نصائح الدراسة، وكونوا على اطلاع بأخبار المدرسة." },
  visit_parent: { en: "Visit Parent Corner", ar: "زيارة ركن الوالدين" },
  for_students: { en: "For Students", ar: "للطلاب" },
  for_students_d: { en: "Your dashboard, assignments, certificates, and quizzes — all in one place.", ar: "لوحة التحكم والواجبات والشهادات والاختبارات — في مكان واحد." },
  open_portal: { en: "Open Student Portal", ar: "افتح بوابة الطالب" },

  // Lesson structure (for future pages)
  ls_outcome: { en: "Learning Outcome", ar: "نواتج التعلّم" },
  ls_content: { en: "Lesson Content", ar: "محتوى الدرس" },
  ls_worksheet: { en: "Worksheet", ar: "ورقة العمل" },
  ls_pdf: { en: "PDF", ar: "PDF" },
  ls_video: { en: "Video Lesson", ar: "الدرس المرئي" },
  ls_quiz: { en: "Quiz", ar: "الاختبار" },
  ls_downloads: { en: "Downloads", ar: "التحميلات" },
  ls_resources: { en: "Resources", ar: "الموارد" },
  ls_teacher: { en: "Teacher Notes", ar: "ملاحظات المعلم" },
  ls_parent_res: { en: "Parent Resources", ar: "موارد ولي الأمر" },

  // Footer
  ft_learn: { en: "Learn", ar: "تعلّم" },
  ft_explore: { en: "Explore", ar: "استكشف" },
  ft_contact: { en: "Contact", ar: "تواصل" },
  ft_desc: { en: "Igniting Knowledge, Faith, and Character for students from KG1 to Grade 12.", ar: "نُشعل المعرفة والإيمان والأخلاق للطلاب من الروضة إلى الصف الثاني عشر." },
  ft_rights: { en: "All rights reserved.", ar: "جميع الحقوق محفوظة." },
  ft_built: { en: "Built with sincerity ✦ بسم الله", ar: "صُنع بإخلاص ✦ بسم الله" },
  ft_online: { en: "Online Worldwide", ar: "عبر الإنترنت حول العالم" },

  // Ask Ignite AI
  ask_label: { en: "Ask Ignite", ar: "اسأل اجنايت" },
  select_language: { en: "Select language", ar: "اختر اللغة" },
  ask_sub: { en: "Ignite Islamic Academy AI Assistant", ar: "مساعد أكاديمية اجنايت الإسلامية الذكي" },
  ask_greet: {
    en: "Peace be upon you! I'm Ask Ignite. Ask me anything about your Islamic Studies lessons — Quran, Hadith, Fiqh, Seerah, and more.",
    ar: "السلام عليكم! أنا مساعد اجنايت. اسألني أي سؤال عن دروس الدراسات الإسلامية — القرآن والحديث والفقه والسيرة وغيرها.",
  },
  ask_placeholder: { en: "Type your question...", ar: "اكتب سؤالك..." },

  switch_lang: { en: "العربية", ar: "English" },

  // Grades / Lessons pages
  grades_page_title: { en: "Grades 8–12 Curriculum", ar: "منهج الصفوف 8–12" },
  grades_page_desc: { en: "Browse Islamic Studies lessons for each grade from the CMS.", ar: "تصفح دروس الدراسات الإسلامية لكل صف من نظام إدارة المحتوى." },
  view_lessons: { en: "View Lessons", ar: "عرض الدروس" },
  back_to_grades: { en: "Back to Grades", ar: "العودة إلى الصفوف" },
  back_to_grade: { en: "Back to Grade", ar: "العودة إلى الصف" },
  lesson: { en: "Lesson", ar: "درس" },
  vocab: { en: "📚 Key Vocabulary", ar: "📚 المفردات الأساسية" },
  vocab_subtitle: { en: "Tap a card to discover the meaning", ar: "اضغط على البطاقة لاكتشاف معنى الكلمة" },
  vocab_meaning_soon: { en: "Meaning will be added soon", ar: "معنى هذه الكلمة سيُضاف قريبًا" },
  vocab_flip_hint: { en: "Tap to flip", ar: "اضغط للقلب" },
  start_quiz: { en: "Start Quiz", ar: "ابدأ الاختبار" },
  question: { en: "Question", ar: "سؤال" },
  submit_quiz: { en: "Submit", ar: "إرسال" },
  retry_quiz: { en: "Try Again", ar: "حاول مرة أخرى" },
  your_score: { en: "Your Score", ar: "نتيجتك" },
  correct: { en: "Correct", ar: "صحيح" },
  incorrect: { en: "Incorrect", ar: "خطأ" },
  download_pdf: { en: "Download PDF", ar: "تحميل PDF" },
  download_ppt: { en: "Download PowerPoint", ar: "تحميل PowerPoint" },
  download_worksheet: { en: "Download Worksheet", ar: "تحميل ورقة العمل" },
  video_coming: { en: "Video lesson coming soon", ar: "الدرس المرئي قريباً" },

  // New page generic
  back: { en: "Back", ar: "رجوع" },
  read_more: { en: "Read more", ar: "اقرأ المزيد" },
  watch_video: { en: "Watch video", ar: "شاهد الفيديو" },
  take_quiz: { en: "Take quiz", ar: "ابدأ الاختبار" },
  open: { en: "Open", ar: "افتح" },
  send: { en: "Send", ar: "إرسال" },
  view_grades_in_stage: { en: "View grades in this stage", ar: "عرض الصفوف في هذه المرحلة" },
  all_stages: { en: "All Academic Stages", ar: "جميع المراحل" },
  stage_overview: { en: "Stage Overview", ar: "نظرة عامة على المرحلة" },

  // About
  about_title: { en: "About Ignite Islamic Academy", ar: "عن أكاديمية اجنايت الإسلامية" },
  about_lead: { en: "An online Islamic education platform serving students, parents, and teachers from KG1 to Grade 12.", ar: "منصة تعليم إسلامي عبر الإنترنت تخدم الطلاب وأولياء الأمور والمعلمين من رياض الأطفال إلى الصف الثاني عشر." },
  about_mission_t: { en: "Our Mission", ar: "رسالتنا" },
  about_mission_d: { en: "To ignite knowledge, faith, and character in every learner through authentic, modern, and engaging Islamic Studies.", ar: "أن نُشعل المعرفة والإيمان والأخلاق في كل متعلّم من خلال دراسات إسلامية أصيلة وعصرية وجذّابة." },
  about_vision_t: { en: "Our Vision", ar: "رؤيتنا" },
  about_vision_d: { en: "A connected global classroom where every Muslim student has access to excellent Islamic education.", ar: "فصل دراسي عالمي مترابط يحصل فيه كل طالب مسلم على تعليم إسلامي متميز." },
  about_values_t: { en: "Our Values", ar: "قيمنا" },
  about_values_d: { en: "Sincerity (Ikhlas), Excellence (Ihsan), Knowledge (Ilm), Compassion (Rahma).", ar: "الإخلاص، والإحسان، والعلم، والرحمة." },

  // Student Portal
  student_title: { en: "Student Portal", ar: "بوابة الطالب" },
  student_lead: { en: "Your dashboard, lessons, quizzes, and certificates — all in one place.", ar: "لوحة التحكم، والدروس، والاختبارات، والشهادات — في مكان واحد." },
  student_dashboard_title: { en: "Student Dashboard", ar: "لوحة تحكم الطالب" },
  student_dashboard_lead: { en: "Track your lesson progress, quiz scores, certificates, and achievements.", ar: "تابع تقدّمك في الدروس، ودرجات الاختبارات، والشهادات، والإنجازات." },
  student_profile_lead: {
    en: "View and update your personal details, photo, and class grouping.",
    ar: "عرض وتحديث بياناتك الشخصية والصورة والمجموعة الدراسية.",
  },
  student_back_dashboard: { en: "Back to dashboard", ar: "العودة إلى لوحة الطالب" },
  student_cert_note: {
    en: "These names and your photo will be used on achievement certificates.",
    ar: "تُستخدم هذه الأسماء والصورة على شهادات الإنجاز.",
  },
  student_profile_updated: { en: "Profile updated", ar: "تم تحديث الملف الشخصي" },
  student_saving: { en: "Saving…", ar: "جارٍ الحفظ…" },
  save_changes: { en: "Save changes", ar: "حفظ التغييرات" },
  student_complete_profile_notice: {
    en: "Please complete your profile (English and Arabic names) before generating certificates.",
    ar: "يرجى إكمال ملفك الشخصي (الاسم بالإنجليزية والعربية) قبل إنشاء الشهادات.",
  },
  student_loading_progress: { en: "Loading your progress…", ar: "جارٍ تحميل التقدّم…" },
  student_load_progress_error: {
    en: "Could not load progress: {error}",
    ar: "تعذر تحميل التقدّم: {error}",
  },
  welcome_greeting: { en: "Welcome", ar: "مرحبًا" },
  profile_photo_hint: {
    en: "Clear face photo — JPEG, PNG, or WebP (max 5 MB)",
    ar: "صورة واضحة للوجه — JPEG أو PNG أو WebP (حتى 5 ميجابايت)",
  },
  profile_photo_choose: { en: "Choose photo", ar: "اختر صورة" },
  profile_change_photo: { en: "Change photo", ar: "تغيير الصورة" },
  profile_photo_remove: { en: "Remove", ar: "إزالة" },
  profile_photo_invalid: {
    en: "Invalid photo. Use JPEG, PNG, or WebP (max 5 MB).",
    ar: "صورة غير صالحة. استخدم JPEG أو PNG أو WebP (حتى 5 ميجابايت).",
  },
  copy_failed: { en: "Could not copy", ar: "تعذر النسخ" },
  select_placeholder: { en: "Select…", ar: "اختر…" },
  admin_sign_in_title: { en: "Admin Sign In", ar: "دخول الإدارة" },
  admin_sign_in_lead: {
    en: "Restricted area. Only authorized administrators can manage content.",
    ar: "منطقة محظورة. يمكن للإداريين المصرّح لهم فقط إدارة المحتوى.",
  },
  admin_login_crumb: { en: "Admin Login", ar: "دخول الإدارة" },
  admin_create_account: { en: "Create admin account", ar: "إنشاء حساب إداري" },
  admin_first_admin_link: { en: "First admin? Create an account", ar: "أول إداري؟ أنشئ حسابًا" },
  admin_new_account_note: {
    en: "New accounts have no admin access by default. An existing admin (or the project owner) must add your user to the admin role.",
    ar: "الحسابات الجديدة لا تملك صلاحية إدارية افتراضيًا. يجب على إداري حالي (أو مالك المشروع) إضافة مستخدمك إلى دور الإدارة.",
  },
  admin_welcome_back: { en: "Welcome back.", ar: "مرحبًا بعودتك." },
  admin_not_admin: {
    en: "This account is not an administrator.",
    ar: "هذا الحساب ليس حساب إداري.",
  },
  admin_signup_success: {
    en: "Account created. Ask an existing admin to grant you access, then sign in.",
    ar: "تم إنشاء الحساب. اطلب من إداري حالي منحك الصلاحية، ثم سجّل الدخول.",
  },
  my_grade: { en: "My Grade", ar: "صفّي" },
  recent_lessons: { en: "Recent Lessons", ar: "الدروس الأخيرة" },
  my_quizzes: { en: "My Quizzes", ar: "اختباراتي" },
  my_progress: { en: "My Progress", ar: "تقدّمي" },
  go_to_grade: { en: "Go to my grade", ar: "اذهب إلى صفّي" },

  // Parent Corner
  parent_title: { en: "Parent Corner", ar: "ركن الوالدين" },
  parent_lead: { en: "Guides, exam information, and study tips to support your child's learning at home.", ar: "أدلة ومعلومات الاختبارات ونصائح الدراسة لدعم تعلّم أبنائكم في المنزل." },
  parent_guides: { en: "Parent Guides", ar: "أدلة الوالدين" },
  parent_dashboard_title: { en: "Parent Dashboard", ar: "لوحة ولي الأمر" },
  parent_dashboard_lead: { en: "Monitor your child's progress, certificates, badges, and recent learning activity.", ar: "راقب تقدّم ابنك/ابنتك والشهادات والشارات وآخر نشاط تعليمي." },
  parent_dashboard_cta: { en: "Open Parent Dashboard", ar: "فتح لوحة ولي الأمر" },
  parent_dashboard_loading: { en: "Loading parent dashboard…", ar: "جارٍ تحميل لوحة ولي الأمر…" },
  parent_dashboard_switching: { en: "Loading selected child…", ar: "جارٍ تحميل بيانات الطفل المحدد…" },
  parent_corner_student_msg: {
    en: "Please sign in with a parent account to access Parent Corner and track your child's progress.",
    ar: "يرجى تسجيل الدخول بحساب ولي أمر للوصول إلى ركن الوالدين ومتابعة تقدّم ابنك/ابنتك.",
  },
  parent_corner_parent_login: { en: "Sign out & parent sign in", ar: "تسجيل الخروج ودخول ولي الأمر" },
  parent_corner_parent_signup: { en: "Create parent account", ar: "إنشاء حساب ولي أمر" },
  parent_profile_title: { en: "Parent Profile", ar: "ملف ولي الأمر" },
  parent_profile_lead: {
    en: "View your parent account details and all linked children.",
    ar: "اعرض تفاصيل حساب ولي الأمر وجميع الأبناء المرتبطين.",
  },
  parent_profile_loading: { en: "Loading parent profile…", ar: "جارٍ تحميل ملف ولي الأمر…" },
  parent_name_label: { en: "Parent name", ar: "اسم ولي الأمر" },
  parent_linked_children_title: { en: "Linked children", ar: "الأبناء المرتبطون" },
  parent_linked_children_lead: {
    en: "Students linked to your parent account.",
    ar: "الطلاب المرتبطون بحساب ولي الأمر.",
  },
  parent_child_name_label: { en: "Student name", ar: "اسم الطالب" },
  parent_link_none_error: {
    en: "No linked students yet. Enter a Parent Link Code below to connect your child.",
    ar: "لا يوجد طلاب مرتبطون بعد. أدخل رمز ربط ولي الأمر أدناه لربط طفلك.",
  },
  parent_link_multiple_error: {
    en: "More than one student matched your account. Please contact the school to confirm links.",
    ar: "تم العثور على أكثر من طالب مطابق. يرجى التواصل مع المدرسة لتأكيد الربط.",
  },
  parent_link_code_label: { en: "Student Link Code", ar: "كود الطالب" },
  parent_link_code_reg_label: { en: "Student Link Code", ar: "كود الطالب / Student Link Code" },
  parent_link_code_hint: {
    en: "Enter the code from your child's student dashboard.",
    ar: "أدخل الرمز من لوحة الطالب.",
  },
  parent_link_code_title: { en: "Parent Link Code", ar: "كود ربط ولي الأمر" },
  parent_link_code_note: {
    en: "Share this code only with your parent.",
    ar: "شارك هذا الكود مع ولي أمرك فقط",
  },
  parent_link_code_copy: { en: "Copy code", ar: "نسخ الرمز" },
  parent_link_code_copied: { en: "Code copied!", ar: "تم نسخ الرمز!" },
  parent_link_code_invalid: {
    en: "That link code is not valid. Please check the code and try again.",
    ar: "رمز الربط غير صالح. يرجى التحقق من الرمز والمحاولة مرة أخرى.",
  },
  parent_link_code_success: {
    en: "Student linked successfully.",
    ar: "تم ربط الطالب بنجاح.",
  },
  parent_link_code_already: {
    en: "This student is already linked to your account.",
    ar: "هذا الطالب مرتبط بحسابك بالفعل.",
  },
  parent_add_child_title: { en: "Add another student", ar: "إضافة طالب آخر" },
  parent_add_child_lead: {
    en: "Enter a Parent Link Code from your child's student dashboard.",
    ar: "أدخل رمز ربط ولي الأمر من لوحة الطالب.",
  },
  parent_add_child_submit: { en: "Link child", ar: "ربط الطفل" },

  // Resources
  res_title: { en: "Resource Library", ar: "المكتبة التعليمية" },
  res_lead: { en: "PDFs, worksheets, presentations, and revision packs — searchable by grade.", ar: "ملفات PDF، وأوراق عمل، وعروض، وحزم مراجعة — قابلة للبحث حسب الصف." },
  res_search: { en: "Search resources...", ar: "ابحث في الموارد..." },
  res_all: { en: "All", ar: "الكل" },

  // Videos
  vid_title: { en: "Video Lessons", ar: "الدروس المرئية" },
  vid_lead: { en: "Engaging video curriculum, organized by unit and grade.", ar: "منهج فيديو شيّق منظَّم حسب الوحدة والصف." },

  // Quizzes
  quiz_title: { en: "Online Quizzes", ar: "الاختبارات الإلكترونية" },
  quiz_lead: { en: "Test your understanding with instant feedback and scores.", ar: "اختبر فهمك مع تغذية راجعة فورية ونتائج." },

  // Announcements
  ann_page_title: { en: "Announcements", ar: "الإعلانات" },
  ann_page_lead: { en: "Latest school news, events, and exam updates.", ar: "أحدث أخبار المدرسة وفعالياتها وتحديثات الاختبارات." },

  // Contact
  contact_title: { en: "Contact Us", ar: "اتصل بنا" },
  contact_lead: { en: "We'd love to hear from students, parents, and educators.", ar: "يسعدنا التواصل مع الطلاب وأولياء الأمور والمعلمين." },
  your_name: { en: "Your name", ar: "اسمك" },
  your_email: { en: "Your email", ar: "بريدك الإلكتروني" },
  your_message: { en: "Your message", ar: "رسالتك" },

  // Admin
  admin_title: { en: "Admin Dashboard", ar: "لوحة الإدارة" },
  admin_lead: { en: "Manage grades, lessons, students, and content via Supabase CMS.", ar: "إدارة الصفوف والدروس والطلاب والمحتوى عبر نظام إدارة المحتوى." },
  total_grades: { en: "Total Grades", ar: "إجمالي الصفوف" },
  total_lessons: { en: "Total Lessons", ar: "إجمالي الدروس" },
  total_quizzes: { en: "Quiz Questions", ar: "أسئلة الاختبارات" },
  total_videos: { en: "Videos", ar: "الفيديوهات" },

  // Breadcrumb
  bc_home: { en: "Home", ar: "الرئيسية" },

  // Search & filters
  search_placeholder: { en: "Search…", ar: "ابحث…" },
  filter_by_grade: { en: "Filter by grade", ar: "تصفية حسب الصف" },
  filter_by_lesson: { en: "Filter by lesson", ar: "تصفية حسب الدرس" },
  filter_by_unit: { en: "Filter by unit", ar: "تصفية حسب الوحدة" },
  filter_by_type: { en: "Filter by type", ar: "تصفية حسب النوع" },
  rl_all_lessons: { en: "All lessons", ar: "جميع الدروس" },
  empty_lesson_resources: {
    en: "No lesson files available yet.",
    ar: "لا توجد ملفات دروس متاحة بعد.",
  },
  empty_lesson_videos: {
    en: "No lesson videos available yet.",
    ar: "لا توجد دروس مرئية متاحة بعد.",
  },
  video_watch_ar: { en: "Watch Arabic video", ar: "مشاهدة الفيديو العربي" },
  video_watch_en: { en: "Watch English video", ar: "مشاهدة الفيديو الإنجليزي" },
  video_watch_lesson: { en: "Watch lesson video", ar: "مشاهدة فيديو الدرس" },
  open_lesson: { en: "Open lesson page", ar: "فتح صفحة الدرس" },
  filter_all: { en: "All", ar: "الكل" },
  clear_filters: { en: "Clear", ar: "مسح" },

  // Empty states
  empty_lessons: { en: "No lessons added yet.", ar: "لا توجد دروس بعد." },
  empty_files: { en: "No files available.", ar: "لا توجد ملفات متاحة." },
  empty_videos: { en: "No videos uploaded.", ar: "لم يتم رفع أي فيديوهات." },
  empty_quizzes: { en: "No quizzes yet.", ar: "لا توجد اختبارات بعد." },
  empty_articles: { en: "No articles published.", ar: "لا توجد مقالات منشورة." },
  hof_title: { en: "Hall of Fame", ar: "لوحة الشرف" },
  hof_lead: {
    en: "Celebrating our students' dedication, quiz excellence, and earned certificates.",
    ar: "نحتفي بتفوق طلابنا وإنجازاتهم في الاختبارات والشهادات.",
  },
  hof_loading: { en: "Loading achievements…", ar: "جاري تحميل الإنجازات…" },
  hof_error: { en: "Could not load Hall of Fame", ar: "تعذر تحميل لوحة الشرف" },
  hof_empty_title: { en: "No achievements yet", ar: "لا توجد إنجازات بعد" },
  hof_empty_desc: {
    en: "Students will appear here once quiz results and certificates are recorded.",
    ar: "سيظهر الطلاب هنا بعد تسجيل نتائج الاختبارات والشهادات.",
  },
  hof_student_of_month: { en: "Student of the Month", ar: "طالب الشهر" },
  hof_achievement_badge: { en: "Outstanding Achievement", ar: "إنجاز متميز" },
  hof_grade_champions: { en: "Grade Champions", ar: "أبطال الصفوف" },
  hof_top_students: { en: "Top 10 Students in the Academy", ar: "أفضل ١٠ طلاب في الأكاديمية" },
  empty_units: { en: "No units published yet.", ar: "لا توجد وحدات منشورة بعد." },
  empty_results: { en: "No results match your search.", ar: "لا توجد نتائج تطابق بحثك." },
  empty_info: { en: "No information added yet.", ar: "لم تتم إضافة معلومات بعد." },

  // Overview / recent
  view_all: { en: "View all", ar: "عرض الكل" },
  recent: { en: "Recent", ar: "الأحدث" },
  add_content: { en: "Add content", ar: "إضافة محتوى" },
  admin_only: { en: "Admin only", ar: "للإداريين فقط" },

  // Auth (platform UI)
  auth_title: { en: "Student Account", ar: "حساب الطالب" },
  auth_lead: {
    en: "Create your account or sign in to access your lessons, quizzes, and progress.",
    ar: "أنشئ حسابك أو سجّل الدخول للوصول إلى دروسك واختباراتك وتقدّمك.",
  },
  auth_create_student: { en: "Create Student Account", ar: "إنشاء حساب طالب" },
  auth_create_parent: { en: "Create Parent Account", ar: "إنشاء حساب ولي أمر" },
  auth_login: { en: "Login", ar: "تسجيل الدخول" },
  auth_account_type: { en: "Account type", ar: "نوع الحساب" },
  auth_student_account: { en: "Student Account", ar: "حساب طالب" },
  auth_parent_account: { en: "Parent Account", ar: "حساب ولي أمر" },
  auth_teacher_account: { en: "Teacher Account", ar: "حساب مدرس" },
  auth_create_teacher: { en: "Create Teacher Account", ar: "إنشاء حساب مدرس" },
  auth_teacher_full_name: { en: "Full name", ar: "الاسم الكامل" },
  auth_teacher_phone: { en: "Phone number (optional)", ar: "رقم الهاتف (اختياري)" },
  auth_confirm_password: { en: "Confirm password", ar: "تأكيد كلمة المرور" },
  auth_err_teacher_name: {
    en: "Please enter your full name.",
    ar: "يرجى إدخال الاسم الكامل.",
  },
  auth_err_confirm_password: {
    en: "Please confirm your password.",
    ar: "يرجى تأكيد كلمة المرور.",
  },
  auth_err_password_mismatch: {
    en: "Passwords do not match.",
    ar: "كلمتا المرور غير متطابقتين.",
  },
  auth_success_teacher_pending: {
    en: "Your teacher account request was submitted. An administrator will review it before access is granted.",
    ar: "تم إرسال طلب حساب المعلم. ستراجع الإدارة الطلب قبل تفعيل الحساب.",
  },
  auth_teacher_pending_login: {
    en: "Your teacher account is awaiting administrator approval.",
    ar: "حساب المعلم قيد مراجعة الإدارة. سيتم تفعيل لوحة المعلم بعد الموافقة.",
  },
  auth_teacher_rejected_login: {
    en: "Your teacher account request was not approved. Please contact the school administration.",
    ar: "لم تتم الموافقة على طلب حساب المعلم. يرجى التواصل مع إدارة المدرسة.",
  },
  admin_teacher_requests_title: { en: "Pending teacher requests", ar: "طلبات المعلمين المعلقة" },
  admin_teacher_requests_empty: {
    en: "No pending teacher requests.",
    ar: "لا توجد طلبات معلمين معلقة.",
  },
  admin_teacher_request_date: { en: "Request date", ar: "تاريخ الطلب" },
  admin_teacher_approve: { en: "Approve", ar: "موافقة" },
  admin_teacher_reject: { en: "Reject", ar: "رفض" },
  admin_teacher_request_approved: {
    en: "Teacher request approved.",
    ar: "تمت الموافقة على طلب المعلم.",
  },
  admin_teacher_request_rejected: {
    en: "Teacher request rejected.",
    ar: "تم رفض طلب المعلم.",
  },
  teacher_title: { en: "Teacher Dashboard", ar: "لوحة المعلم" },
  teacher_welcome: { en: "Teacher Dashboard", ar: "لوحة المعلم" },
  teacher_lead: {
    en: "View and manage your classes, students, lessons, quizzes, and assignments within your assigned scope.",
    ar: "اعرض وادِر صفوفك وطلابك ودروسك واختباراتك وواجباتك ضمن نطاق تكليفك.",
  },
  teacher_welcome_name: { en: "Welcome, {name}", ar: "مرحبًا، {name}" },
  teacher_scope_lead: {
    en: "You only see students and data within your assigned teaching scope.",
    ar: "ترى فقط الطلاب والبيانات ضمن نطاق تدريسك المكلّف.",
  },
  teacher_assigned_grades: { en: "Assigned grades", ar: "الصفوف المكلّفة" },
  teacher_assigned_sections: { en: "Assigned sections", ar: "الشعب المكلّفة" },
  teacher_assigned_groups: { en: "Islamic groups", ar: "المجموعات الإسلامية" },
  teacher_all_sections: { en: "All sections", ar: "كل الشعب" },
  teacher_all_groups: { en: "Both groups", ar: "كلا المجموعتين" },
  teacher_loading: { en: "Loading…", ar: "جارٍ التحميل…" },
  teacher_load_error: { en: "Could not load teacher dashboard.", ar: "تعذّر تحميل لوحة المعلم." },
  teacher_access_denied: {
    en: "This area is only available to approved teachers.",
    ar: "هذه المنطقة متاحة للمعلمين الموافق عليهم فقط.",
  },
  teacher_nav_overview: { en: "Overview", ar: "نظرة عامة" },
  teacher_nav_classes: { en: "My Classes", ar: "صفوفي" },
  teacher_nav_students: { en: "My Students", ar: "طلابي" },
  teacher_nav_lessons: { en: "Lessons", ar: "الدروس" },
  teacher_nav_quizzes: { en: "Quizzes", ar: "الاختبارات" },
  teacher_nav_assignments: { en: "Assignments", ar: "الواجبات" },
  teacher_nav_performance: { en: "Student Performance", ar: "أداء الطلاب" },
  teacher_stat_students: { en: "My Students", ar: "طلابي" },
  teacher_stat_classes: { en: "My Classes", ar: "صفوفي" },
  teacher_stat_lessons: { en: "Lessons", ar: "الدروس" },
  teacher_stat_quizzes: { en: "Quiz activity", ar: "نشاط الاختبارات" },
  teacher_stat_assignments: { en: "Assignments", ar: "الواجبات" },
  teacher_stat_submitted: { en: "Submitted work", ar: "الأعمال المسلّمة" },
  teacher_stat_avg_quiz: { en: "Average quiz score", ar: "متوسط درجات الاختبارات" },
  teacher_my_classes: { en: "My Classes", ar: "صفوفي" },
  teacher_no_classes: {
    en: "No classes have been assigned to you yet.",
    ar: "لم يتم تعيين صفوف لك بعد.",
  },
  teacher_no_students: { en: "No students in your scope.", ar: "لا يوجد طلاب في نطاقك." },
  teacher_view_students: { en: "View students", ar: "عرض الطلاب" },
  teacher_filtered_by: { en: "Filtered by", ar: "مُصفّى حسب" },
  teacher_col_name: { en: "Student", ar: "الطالب" },
  teacher_col_scope: { en: "Grade / Section / Group", ar: "الصف / الشعبة / المجموعة" },
  teacher_col_progress: { en: "Progress", ar: "التقدّم" },
  teacher_col_avg_quiz: { en: "Avg quiz", ar: "متوسط الاختبار" },
  teacher_col_certificates: { en: "Certificates", ar: "الشهادات" },
  teacher_col_lessons: { en: "Lessons done", ar: "دروس مكتملة" },
  teacher_back_students: { en: "Back to students", ar: "العودة إلى الطلاب" },
  teacher_student_not_found: { en: "Student not found in your scope.", ar: "الطالب غير موجود في نطاقك." },
  teacher_sign_out: { en: "Sign out", ar: "تسجيل الخروج" },
  teacher_no_lessons: { en: "No lessons in your assigned grades.", ar: "لا توجد دروس في الصفوف المكلّفة." },
  teacher_draft: { en: "Draft", ar: "مسودة" },
  teacher_edit: { en: "Edit", ar: "تعديل" },
  teacher_lesson_not_found: { en: "Lesson not found.", ar: "الدرس غير موجود." },
  teacher_lesson_out_of_scope: {
    en: "You cannot edit lessons outside your assigned grades.",
    ar: "لا يمكنك تعديل دروس خارج الصفوف المكلّفة.",
  },
  teacher_back_lessons: { en: "Back to lessons", ar: "العودة إلى الدروس" },
  teacher_no_quiz_submissions: { en: "No quiz submissions in your scope.", ar: "لا توجد إرسالات اختبار في نطاقك." },
  teacher_quiz_saved: { en: "Quiz review saved.", ar: "تم حفظ مراجعة الاختبار." },
  teacher_save_review: { en: "Save review", ar: "حفظ المراجعة" },
  teacher_assignment_graded: { en: "Submission graded.", ar: "تم تقييم الإرسال." },
  teacher_grade: { en: "Grade", ar: "تقييم" },
  teacher_new_lesson: { en: "New lesson", ar: "درس جديد" },
  teacher_save_failed: { en: "Save failed.", ar: "تعذّر الحفظ." },
  teacher_delete: { en: "Delete", ar: "حذف" },
  teacher_cancel: { en: "Cancel", ar: "إلغاء" },
  teacher_deleting: { en: "Deleting…", ar: "جارٍ الحذف…" },
  teacher_delete_lesson_title: { en: "Delete lesson", ar: "حذف الدرس" },
  teacher_delete_lesson_confirm: {
    en: "This will hide the lesson from students. Quiz submissions, certificates, and scores linked to this lesson will remain in the system until permanently removed by an administrator.",
    ar: "سيؤدي هذا إلى إخفاء الدرس عن الطلاب. ستبقى إرسالات الاختبارات والشهادات والدرجات المرتبطة بهذا الدرس في النظام حتى يزيلها المسؤول نهائيًا.",
  },
  teacher_lesson_deleted: { en: "Lesson deleted.", ar: "تم حذف الدرس." },
  teacher_delete_assignment_title: { en: "Delete assignment", ar: "حذف الواجب" },
  teacher_delete_assignment_confirm: {
    en: "This permanently deletes the assignment and all student submissions, scores, and feedback for it. This cannot be undone.",
    ar: "سيؤدي هذا إلى حذف الواجب نهائيًا وجميع إرسالات الطلاب ودرجاتهم وملاحظاتهم عليه. لا يمكن التراجع عن هذا الإجراء.",
  },
  teacher_assignment_deleted: { en: "Assignment deleted.", ar: "تم حذف الواجب." },
  teacher_lead_analytics_note: {
    en: "As Lead Teacher, you can view Islamic Department academic analytics across all grades, sections, and Islamic groups.",
    ar: "بصفتك مسؤول القسم، يمكنك عرض تحليلات الأداء الأكاديمي لقسم الدراسات الإسلامية في كل الصفوف والشعب والمجموعات.",
  },
  teacher_analytics_summary: { en: "Analytics summary", ar: "ملخص التحليلات" },
  teacher_all_grades: { en: "All grades", ar: "كل الصفوف" },
  teacher_analytics_not_permitted: {
    en: "This analytics filter is outside your assigned teaching scope.",
    ar: "عامل تصفية التحليلات هذا خارج نطاق تدريسك المكلّف.",
  },
  teacher_home_welcome: {
    en: "Welcome to your Teacher Workspace",
    ar: "مرحباً بك في مساحة المعلم",
  },
  teacher_home_my_stages: { en: "My Academic Stages", ar: "مراحلي الأكاديمية" },
  teacher_home_my_stages_desc: {
    en: "Grades and classes within your assigned teaching scope.",
    ar: "الصفوف والشعب ضمن نطاق تدريسك المكلّف.",
  },
  teacher_home_quick_actions: { en: "Quick actions", ar: "إجراءات سريعة" },
  teacher_home_add_lesson: { en: "Add lesson", ar: "إضافة درس" },
  teacher_home_create_assignment: { en: "Create assignment", ar: "إنشاء واجب" },
  teacher_home_review_quizzes: { en: "Review quizzes", ar: "مراجعة الاختبارات" },
  teacher_home_view_students: { en: "View students", ar: "عرض الطلاب" },
  teacher_home_view_performance: { en: "View performance", ar: "عرض الأداء" },
  teacher_home_scope_summary: { en: "Your teaching scope", ar: "نطاق تدريسك" },
  teacher_sidebar_overview: { en: "Overview", ar: "نظرة عامة" },
  teacher_sidebar_content: { en: "Content", ar: "المحتوى" },
  teacher_sidebar_assessment: { en: "Assessment", ar: "التقييم" },
  teacher_sidebar_scope: { en: "My School Scope", ar: "نطاق مدرستي" },
  teacher_sidebar_academic: { en: "Academic Management", ar: "الإدارة الأكاديمية" },
  teacher_nav_add_lesson: { en: "Add Lesson", ar: "إضافة درس" },
  teacher_nav_manage_lessons: { en: "Manage Lessons", ar: "إدارة الدروس" },
  teacher_nav_articles: { en: "Articles", ar: "المقالات" },
  teacher_nav_videos: { en: "Videos", ar: "الفيديوهات" },
  teacher_nav_resources: { en: "Resources", ar: "الموارد" },
  teacher_nav_class_users: { en: "Parents / Class Users", ar: "أولياء الأمور / مستخدمي الصف" },
  teacher_nav_parents: { en: "Parents / Class Users", ar: "أولياء الأمور / مستخدمو صفوفي" },
  teacher_nav_add_article: { en: "Add Article", ar: "إضافة مقال جديد" },
  teacher_nav_manage_articles: { en: "Manage Articles", ar: "إدارة المقالات" },
  teacher_nav_manage_videos: { en: "Manage Videos", ar: "إدارة الفيديوهات" },
  teacher_nav_upload_file: { en: "Upload File", ar: "رفع ملف" },
  teacher_nav_manage_resources: { en: "Manage Resources", ar: "إدارة الموارد" },
  teacher_nav_manage_quizzes: { en: "Manage Quizzes", ar: "إدارة الاختبارات" },
  teacher_nav_manage_assignments: { en: "Manage Assignments", ar: "إدارة الواجبات" },
  teacher_nav_manage_units: { en: "Manage Units", ar: "إدارة الوحدات" },
  teacher_nav_add_announcement: { en: "Add Announcement", ar: "إضافة إعلان" },
  teacher_nav_manage_announcements: { en: "Manage Announcements", ar: "إدارة الإعلانات" },
  teacher_article_grade_required: {
    en: "Title and grade are required.",
    ar: "العنوان والصف مطلوبان.",
  },
  teacher_manage_quizzes_desc: {
    en: "Edit lesson quizzes in your assigned grades.",
    ar: "عدّل اختبارات الدروس في الصفوف المكلّفة.",
  },
  teacher_quiz_questions: { en: "questions", ar: "أسئلة" },
  teacher_edit_quiz: { en: "Edit quiz", ar: "تعديل الاختبار" },
  teacher_nav_curriculum: { en: "Curriculum / Units", ar: "المنهج / الوحدات" },
  teacher_nav_weekly_planning: { en: "Weekly Planning", ar: "الخطة الأسبوعية" },
  teacher_nav_add_weekly_plan: { en: "Add Weekly Plan", ar: "إضافة خطة أسبوعية" },
  wp_new_plan: { en: "New weekly plan", ar: "خطة أسبوعية جديدة" },
  wp_edit_plan: { en: "Edit weekly plan", ar: "تعديل الخطة الأسبوعية" },
  wp_back_to_list: { en: "Back to weekly plans", ar: "العودة إلى الخطط الأسبوعية" },
  wp_back_to_plan: { en: "Back to plan", ar: "العودة إلى الخطة" },
  wp_not_found: { en: "Weekly plan not found or not accessible.", ar: "الخطة الأسبوعية غير موجودة أو غير متاحة." },
  wp_no_plans: { en: "No weekly plans yet.", ar: "لا توجد خطط أسبوعية بعد." },
  wp_no_title: { en: "Untitled lesson", ar: "درس بدون عنوان" },
  wp_saved: { en: "Weekly plan saved.", ar: "تم حفظ الخطة الأسبوعية." },
  wp_save_draft: { en: "Save draft", ar: "حفظ كمسودة" },
  wp_save_return: { en: "Save & return to list", ar: "حفظ والعودة إلى القائمة" },
  wp_grade_required: { en: "Grade is required.", ar: "الصف مطلوب." },
  wp_scope_forbidden: { en: "Selected class scope is outside your assignment.", ar: "نطاق الصف المحدد خارج تكليفك." },
  wp_duplicate_scope_error: {
    en: "A plan already exists for this week and class scope.",
    ar: "توجد خطة بالفعل لهذا الأسبوع ونطاق الصف.",
  },
  wp_status_not_started: { en: "Not started", ar: "لم يبدأ" },
  wp_status_in_progress: { en: "In progress", ar: "قيد التنفيذ" },
  wp_status_complete: { en: "Complete", ar: "مكتمل" },
  wp_completion_title: { en: "Completion", ar: "الإكمال" },
  wp_completion_core: { en: "Core planning", ar: "التخطيط الأساسي" },
  wp_completion_diff: { en: "Differentiation", ar: "التمايز" },
  wp_completion_first: { en: "First period", ar: "الحصة الأولى" },
  wp_completion_second: { en: "Second period", ar: "الحصة الثانية" },
  wp_completion_reflection: { en: "Reflection", ar: "التأمل" },
  wp_completion_total: { en: "Total", ar: "الإجمالي" },
  wp_completion_missing: { en: "Missing", ar: "ناقص" },
  wp_next_action_complete: { en: "Plan is complete — ready to print.", ar: "الخطة مكتملة — جاهزة للطباعة." },
  wp_next_action_core: { en: "Complete core planning fields.", ar: "أكمل حقول التخطيط الأساسي." },
  wp_next_action_diff: { en: "Add differentiation notes or student selections.", ar: "أضف ملاحظات التمايز أو اختيار الطلاب." },
  wp_next_action_first: { en: "Complete first period lesson flow.", ar: "أكمل تدفق الحصة الأولى." },
  wp_next_action_second: { en: "Complete second period lesson flow.", ar: "أكمل تدفق الحصة الثانية." },
  wp_next_action_reflection: { en: "Add teacher reflection beyond the template.", ar: "أضف تأمل المعلم بما يتجاوز القالب." },
  wp_section_scope: { en: "Header & scope", ar: "الرأس والنطاق" },
  wp_section_lesson: { en: "Lesson metadata", ar: "بيانات الدرس" },
  wp_section_differentiation: { en: "Differentiation", ar: "التمايز" },
  wp_section_first_period: { en: "First period", ar: "الحصة الأولى" },
  wp_section_second_period: { en: "Second period", ar: "الحصة الثانية" },
  wp_section_reflection: { en: "Teacher reflection", ar: "تأمل المعلم" },
  wp_field_teacher: { en: "Teacher", ar: "المعلم" },
  wp_field_week: { en: "Week", ar: "الأسبوع" },
  wp_field_grade: { en: "Grade", ar: "الصف" },
  wp_field_section: { en: "Section", ar: "الشعبة" },
  wp_field_sections: { en: "Sections", ar: "الشعب" },
  wp_select_all_sections: { en: "Select All", ar: "تحديد الكل" },
  wp_sections_required: {
    en: "Select at least one section.",
    ar: "اختر شعبة واحدة على الأقل.",
  },
  wp_field_islamic_group: { en: "Islamic group", ar: "المجموعة الإسلامية" },
  wp_field_phase: { en: "Phase", ar: "المرحلة" },
  wp_field_student_count: { en: "Student count", ar: "عدد الطلاب" },
  wp_field_subject: { en: "Subject", ar: "المادة" },
  wp_field_day: { en: "Day", ar: "اليوم" },
  wp_field_date: { en: "Date", ar: "التاريخ" },
  wp_non_working_day: {
    en: "This date is a non-working day (Saturday or Sunday). Choose a school day or pick the day manually.",
    ar: "هذا التاريخ يوم غير دوام (السبت أو الأحد). اختر يوم دوام أو حدد اليوم يدوياً.",
  },
  wp_field_domain: { en: "Domain", ar: "المجال" },
  wp_field_success_criterion: { en: "Success criterion", ar: "معيار النجاح" },
  wp_field_learning_outcomes: { en: "Learning outcomes", ar: "مخرجات التعلم" },
  wp_field_unit: { en: "Unit", ar: "الوحدة" },
  wp_field_lesson_title: { en: "Lesson title", ar: "عنوان الدرس" },
  wp_field_uae_culture: { en: "UAE culture link", ar: "ارتباط بالثقافة الإماراتية" },
  wp_field_cross_curricular: { en: "Cross-curricular / real-life connections", ar: "ارتباطات عبر المناهج / الحياة الواقعية" },
  wp_field_p21: { en: "P21 skills", ar: "مهارات القرن 21" },
  wp_p21_max: { en: "Select up to 4 skills.", ar: "اختر حتى 4 مهارات." },
  wp_field_vocabulary: { en: "Key vocabulary", ar: "المفردات الأساسية" },
  wp_field_resources: { en: "Resources / digital platforms", ar: "الموارد / المنصات الرقمية" },
  wp_field_reflection: { en: "Weekly reflection", ar: "التأمل الأسبوعي" },
  wp_select_placeholder: { en: "Select…", ar: "اختر…" },
  wp_week_n: { en: "Week {n}", ar: "الأسبوع {n}" },
  wp_minutes: { en: "min", ar: "د" },
  wp_period_do_now: { en: "Do Now — Engage", ar: "ابدأ الآن — اشرك" },
  wp_period_objective: { en: "Learning objective & success criteria", ar: "هدف التعلم ومعايير النجاح" },
  wp_period_i_do: { en: "I Do", ar: "أنا أفعل" },
  wp_period_we_do: { en: "We Do", ar: "نحن نفعل" },
  wp_period_mid: { en: "Mid assessment / check for understanding", ar: "تقييم منتصف / تحقق من الفهم" },
  wp_period_you_do: { en: "You Do", ar: "أنت تفعل" },
  wp_period_exit: { en: "Exit ticket & SIR", ar: "تذكرة الخروج و SIR" },
  wp_period_sir: { en: "SIR method", ar: "أسلوب SIR" },
  wp_period_homework: { en: "Homework / follow-up", ar: "الواجب / المتابعة" },
  wp_you_do_developing: { en: "Orange — Developing", ar: "برتقالي — نامي" },
  wp_you_do_securing: { en: "Yellow — Securing", ar: "أصفر — متمكن" },
  wp_you_do_mastering: { en: "Green — Mastering", ar: "أخضر — متقن" },
  wp_you_do_extension: { en: "Blue — Extension", ar: "أزرق — إثراء" },
  wp_diff_sod: { en: "Students of Determination (SoD)", ar: "طلاب الهمم (SoD)" },
  wp_diff_eal: { en: "English as an Additional Language (EAL)", ar: "الإنجليزية لغة إضافية (EAL)" },
  wp_diff_gt: { en: "Gifted & Talented (G&T)", ar: "الموهوبون والمتفوقون (G&T)" },
  wp_diff_emirati: { en: "Emirati students", ar: "الطلاب الإماراتيون" },
  wp_diff_notes: { en: "Notes / accommodations", ar: "ملاحظات / تكييفات" },
  wp_diff_notes_placeholder: {
    en: "1.\n\n2.\n\n3.",
    ar: "1.\n\n2.\n\n3.",
  },
  wp_no_students_scope: { en: "No students in this class scope.", ar: "لا يوجد طلاب في نطاق هذا الصف." },
  wp_filter_all_weeks: { en: "All weeks", ar: "كل الأسابيع" },
  wp_filter_all_grades: { en: "All grades", ar: "كل الصفوف" },
  wp_filter_all_sections: { en: "All sections", ar: "كل الشعب" },
  wp_filter_all_status: { en: "All statuses", ar: "كل الحالات" },
  wp_col_status: { en: "Status", ar: "الحالة" },
  wp_col_completion: { en: "Completion", ar: "الإكمال" },
  wp_col_actions: { en: "Actions", ar: "إجراءات" },
  wp_action_view: { en: "View", ar: "عرض" },
  wp_action_edit: { en: "Edit", ar: "تعديل" },
  wp_action_duplicate: { en: "Duplicate", ar: "نسخ" },
  wp_action_print: { en: "Print", ar: "طباعة" },
  wp_action_preview_pdf: { en: "Preview PDF", ar: "معاينة PDF" },
  wp_action_download_pdf: { en: "Download PDF", ar: "تنزيل PDF" },
  wp_preview_title: { en: "Weekly plan preview", ar: "معاينة الخطة الأسبوعية" },
  wp_preview_close: { en: "Close", ar: "إغلاق" },
  wp_pdf_downloaded: {
    en: "Print dialog opened — choose “Save as PDF” to download.",
    ar: "تم فتح نافذة الطباعة — اختر «حفظ كـ PDF» للتنزيل.",
  },
  wp_action_delete: { en: "Delete", ar: "حذف" },
  wp_delete_title: { en: "Delete weekly plan?", ar: "حذف الخطة الأسبوعية؟" },
  wp_delete_desc: {
    en: "This cannot be undone. Only your own scoped plans can be deleted.",
    ar: "لا يمكن التراجع. يمكنك حذف خططك في نطاقك فقط.",
  },
  wp_delete_confirm: { en: "Delete", ar: "حذف" },
  wp_cancel: { en: "Cancel", ar: "إلغاء" },
  wp_duplicate_title: { en: "Duplicate plan", ar: "نسخ الخطة" },
  wp_duplicate_desc: {
    en: "Copy content to a new week. Class scope stays the same; pick the target week.",
    ar: "انسخ المحتوى إلى أسبوع جديد. يبقى نطاق الصف كما هو؛ اختر الأسبوع المستهدف.",
  },
  wp_duplicate_confirm: { en: "Duplicate", ar: "نسخ" },
  wp_duplicated: { en: "Plan duplicated.", ar: "تم نسخ الخطة." },
  wp_complete_label: { en: "complete", ar: "مكتمل" },
  wp_print_title: { en: "Islamic Education Weekly Lesson Plan", ar: "الخطة الأسبوعية لدرس التربية الإسلامية" },
  wp_print_button: { en: "Print", ar: "طباعة" },
  wp_mission_label: { en: "Mission", ar: "الرسالة" },
  wp_vision_label: { en: "Vision", ar: "الرؤية" },
  teacher_nav_announcements: { en: "Announcements", ar: "الإعلانات" },
  teacher_nav_add_video: { en: "Add video", ar: "إضافة فيديو" },
  teacher_upload_resource: { en: "Upload resource", ar: "رفع مورد" },
  teacher_published: { en: "Published", ar: "منشور" },
  teacher_publish: { en: "Publish", ar: "نشر" },
  teacher_save: { en: "Save", ar: "حفظ" },
  teacher_deleted: { en: "Deleted.", ar: "تم الحذف." },
  teacher_video_required: {
    en: "Title and YouTube link are required.",
    ar: "العنوان ورابط يوتيوب مطلوبان.",
  },
  teacher_video_saved: { en: "Video saved.", ar: "تم حفظ الفيديو." },
  teacher_no_videos: { en: "No videos in your assigned grades.", ar: "لا توجد فيديوهات في الصفوف المكلّفة." },
  teacher_file_required: {
    en: "Title and file are required.",
    ar: "العنوان والملف مطلوبان.",
  },
  teacher_file_saved: { en: "Resource saved.", ar: "تم حفظ المورد." },
  teacher_no_resources: { en: "No resources in your assigned grades.", ar: "لا توجد موارد في الصفوف المكلّفة." },
  teacher_add_article: { en: "Add article", ar: "إضافة مقال" },
  teacher_article_saved: { en: "Article saved.", ar: "تم حفظ المقال." },
  teacher_no_articles: { en: "No articles yet.", ar: "لا توجد مقالات بعد." },
  teacher_department_content_only: {
    en: "Department-wide articles and announcements are managed by Lead Teachers only. Grade-scoped content is available under Lessons, Videos, and Resources.",
    ar: "المقالات والإعلانات على مستوى القسم يديرها مسؤول القسم فقط. المحتوى المرتبط بالصفوف متاح ضمن الدروس والفيديوهات والموارد.",
  },
  teacher_curriculum_desc: {
    en: "Open unit curriculum pages for your assigned grades. Unit quizzes and information are managed on each unit page.",
    ar: "افتح صفحات وحدات المنهج للصفوف المكلّفة. تُدار اختبارات ومعلومات الوحدة في صفحة كل وحدة.",
  },
  teacher_users_desc: {
    en: "Students and parents linked to your authorized teaching scope only.",
    ar: "الطلاب وأولياء الأمور المرتبطين بنطاق تدريسك المصرّح فقط.",
  },
  teacher_parents_section: { en: "Parents / Guardians", ar: "أولياء الأمور" },
  teacher_parent_name: { en: "Parent name", ar: "اسم ولي الأمر" },
  teacher_parent_email: { en: "Contact email", ar: "البريد للتواصل" },
  teacher_linked_students: { en: "Linked students", ar: "الطلاب المرتبطين" },
  teacher_no_parents: { en: "No linked parents in your scope.", ar: "لا يوجد أولياء أمور مرتبطين في نطاقك." },
  teacher_view_profile: { en: "View profile", ar: "عرض الملف" },
  teacher_create_assignment: { en: "Create assignment", ar: "إنشاء واجب" },
  teacher_edit_assignment: { en: "Edit assignment", ar: "تعديل الواجب" },
  teacher_assignment_saved: { en: "Assignment saved.", ar: "تم حفظ الواجب." },
  teacher_no_assignments: { en: "No assignments in your scope.", ar: "لا توجد واجبات في نطاقك." },
  teacher_field_grade: { en: "Grade", ar: "الصف" },
  teacher_field_section: { en: "Section", ar: "الشعبة" },
  teacher_field_islamic_group: { en: "Islamic group", ar: "المجموعة الإسلامية" },
  auth_parent_full_name: { en: "Parent full name", ar: "الاسم الكامل لولي الأمر" },
  auth_parent_link_code: { en: "Student Link Code", ar: "كود الطالب" },
  auth_parent_link_code_hint: {
    en: "Enter the code from your child's student dashboard.",
    ar: "أدخل الرمز من لوحة الطالب.",
  },
  auth_arabic_name: { en: "Arabic Student Name", ar: "اسم الطالب بالعربية" },
  auth_arabic_name_hint: {
    en: "Arabic Student Name / اسم الطالب بالعربية",
    ar: "اسم الطالب بالعربية",
  },
  auth_english_name: { en: "English Student Name", ar: "اسم الطالب بالإنجليزية" },
  auth_english_name_hint: {
    en: "English Student Name / اسم الطالب بالإنجليزية",
    ar: "اسم الطالب بالإنجليزية",
  },
  auth_email: { en: "Email", ar: "البريد الإلكتروني" },
  auth_password: { en: "Password", ar: "كلمة المرور" },
  auth_preferred_language: {
    en: "Preferred Language / اللغة المفضلة",
    ar: "اللغة المفضلة / Preferred Language",
  },
  auth_preferred_language_hint: {
    en: "The platform will open in this language after you sign in.",
    ar: "ستفتح المنصة بهذه اللغة بعد تسجيل الدخول.",
  },
  profile_preferred_language_saved: {
    en: "Preferred language updated.",
    ar: "تم تحديث اللغة المفضلة.",
  },
  auth_grade: { en: "Grade", ar: "الصف الدراسي" },
  auth_section: { en: "Section", ar: "الشعبة" },
  auth_islamic_group: { en: "Islamic Group", ar: "المجموعة الإسلامية" },
  auth_profile_photo: { en: "Profile photo", ar: "صورة الملف الشخصي" },
  auth_submit_signup: { en: "Create account", ar: "إنشاء الحساب" },
  auth_submitting: { en: "Please wait…", ar: "يرجى الانتظار…" },
  auth_submit_login: { en: "Sign in", ar: "دخول" },
  auth_to_login: { en: "Have an account? Sign in", ar: "لديك حساب؟ سجّل الدخول" },
  auth_to_signup: { en: "New here? Create an account", ar: "جديد هنا؟ أنشئ حسابًا" },
  auth_welcome: { en: "Welcome to the Academy", ar: "مرحبًا بك في الأكاديمية" },
  auth_explore_academy: { en: "Explore the Academy", ar: "استكشف الأكاديمية" },
  auth_start_journey: { en: "Start your learning journey", ar: "ابدأ رحلتك التعليمية" },
  auth_hero_bullets: {
    en: "My lessons & progress|My quizzes & scores|Video & file library|Parent corner",
    ar: "دروسي وتقدّمي|اختباراتي ودرجاتي|مكتبة الفيديو والملفات|ركن الوالدين",
  },
  auth_duplicate_email: {
    en: "This email is already registered. Please sign in or use a different email.",
    ar: "هذا البريد مسجّل بالفعل. يرجى تسجيل الدخول أو استخدام بريد آخر.",
  },
  auth_err_arabic_name: {
    en: "Please enter the Arabic student name.",
    ar: "يرجى إدخال اسم الطالب بالعربية.",
  },
  auth_err_english_name: {
    en: "Please enter the English student name.",
    ar: "يرجى إدخال اسم الطالب بالإنجليزية.",
  },
  auth_err_section: { en: "Please select your section.", ar: "يرجى اختيار الشعبة." },
  auth_err_grade: { en: "Please select your grade.", ar: "يرجى اختيار الصف." },
  auth_err_islamic_group: {
    en: "Please select your Islamic group.",
    ar: "يرجى اختيار المجموعة الإسلامية.",
  },
  auth_err_photo: { en: "Please upload a profile photo.", ar: "يرجى رفع صورة الملف الشخصي." },
  auth_err_parent_name: {
    en: "Please enter the parent full name.",
    ar: "يرجى إدخال اسم ولي الأمر.",
  },
  auth_err_link_code: {
    en: "Please enter the Parent Link Code.",
    ar: "يرجى إدخال رمز ربط ولي الأمر.",
  },
  auth_success_student: {
    en: "Check your email to verify your account before signing in.",
    ar: "تحقق من بريدك الإلكتروني لتفعيل حسابك قبل تسجيل الدخول.",
  },
  auth_success_parent: {
    en: "Check your email to verify your account before signing in.",
    ar: "تحقق من بريدك الإلكتروني لتفعيل حسابك قبل تسجيل الدخول.",
  },
  auth_signup_complete: {
    en: "Account created successfully. You can log in now.",
    ar: "تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.",
  },
  auth_email_confirmed: {
    en: "Email confirmed successfully. You can now log in.",
    ar: "تم تأكيد البريد الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول.",
  },
  auth_email_not_confirmed: {
    en: "Please confirm your email before signing in.",
    ar: "يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.",
  },
  auth_check_your_email: {
    en: "Check your email",
    ar: "تحقق من بريدك الإلكتروني",
  },
  auth_resend_verification: {
    en: "Resend verification email",
    ar: "إعادة إرسال رسالة التحقق",
  },
  auth_resend_verification_success: {
    en: "Verification email sent. Please check your inbox.",
    ar: "تم إرسال رسالة التحقق. يرجى التحقق من بريدك الإلكتروني.",
  },
  auth_resend_verification_failed: {
    en: "Could not send verification email. Please try again later.",
    ar: "تعذر إرسال رسالة التحقق. يرجى المحاولة مرة أخرى لاحقًا.",
  },
  auth_verification_link_invalid: {
    en: "The verification link is invalid or has expired. Please request a new verification email.",
    ar: "رابط التحقق غير صالح أو انتهت صلاحيته. يرجى طلب رسالة تحقق جديدة.",
  },
  auth_success_login: { en: "Welcome to the Academy", ar: "مرحبًا بك في الأكاديمية" },
  auth_already_linked: {
    en: "This student is already linked.",
    ar: "هذا الطالب مرتبط بالفعل.",
  },
  auth_linked_success: { en: "Student linked successfully.", ar: "تم ربط الطالب بنجاح." },
  sign_out: { en: "Sign out", ar: "تسجيل الخروج" },
  signed_out: { en: "Signed out", ar: "تم تسجيل الخروج" },
  nav_admin: { en: "Admin", ar: "الإدارة" },
  profile_parent: { en: "Parent Profile", ar: "ملف ولي الأمر" },
  profile_student: { en: "Profile", ar: "الملف الشخصي" },
  dept_islamic_ed: {
    en: "Department of Islamic Education – Ignite School",
    ar: "قسم التربية الإسلامية – مدرسة اجنايت",
  },
  empty_published_lessons: { en: "No published lessons yet.", ar: "لا توجد دروس منشورة بعد." },
  empty_announcements_short: { en: "No announcements yet.", ar: "لا توجد إعلانات بعد." },
  empty_announcements_title: { en: "No updates right now", ar: "لا توجد مستجدات حالياً" },
  empty_announcements_intro: { en: "Coming soon:", ar: "سيتم نشر:" },
  empty_announcements_item_news: { en: "School news", ar: "أخبار المدرسة" },
  empty_announcements_item_exams: { en: "Upcoming exams", ar: "الاختبارات القادمة" },
  empty_announcements_item_events: { en: "Events & activities", ar: "الفعاليات والأنشطة" },
  empty_announcements_item_parents: { en: "Parent announcements", ar: "إعلانات أولياء الأمور" },
  empty_announcements_desc: {
    en: "The latest school news and updates will be published here.",
    ar: "وسيتم نشر آخر الأخبار والمستجدات هنا.",
  },
  hof_avg_score_label: { en: "Avg. score", ar: "متوسط الدرجات" },
  hof_certificates_label: { en: "Certificates", ar: "الشهادات" },
  grade_champion_suffix: { en: "Champion", ar: "بطل" },
  not_set: { en: "Not set", ar: "غير محدد" },
  auth_err_email_password: {
    en: "Please enter your email and password.",
    ar: "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
  },
  auth_err_password_length: {
    en: "Password must be at least 8 characters.",
    ar: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
  },
  auth_err_rate_limit: {
    en: "Too many emails sent. Please wait a few minutes before trying again.",
    ar: "تم إرسال عدد كبير من الرسائل. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى.",
  },
  auth_invalid_link_code: {
    en: "That student link code is not valid. Check the code in Parent Settings after signing in.",
    ar: "كود الطالب غير صالح. تحقق من الكود في إعدادات ولي الأمر بعد تسجيل الدخول.",
  },
  parent_dashboard_load_failed: {
    en: "Could not load parent dashboard:",
    ar: "تعذر تحميل لوحة ولي الأمر:",
  },
  content_translating: { en: "Translating…", ar: "جارٍ الترجمة…" },
  content_translation_unavailable: {
    en: "Translation is not available yet.",
    ar: "الترجمة غير متاحة حالياً.",
  },

  assignments_title: { en: "Your Assignments", ar: "واجباتك" },
  assignments_lead: {
    en: "View due dates, submit your work, and check grades and teacher feedback.",
    ar: "اطّلع على مواعيد التسليم، أرسل عملك، وتحقق من الدرجات وملاحظات المعلم.",
  },
  assignment_due_date: { en: "Due", ar: "التسليم" },
  assignment_status_submitted: { en: "Submitted", ar: "مُرسل" },
  assignment_status_missing: { en: "Missing", ar: "ناقص" },
  assignment_status_late: { en: "Late", ar: "متأخر" },
  assignment_status_graded: { en: "Graded", ar: "مُقيّم" },
  assignment_submit: { en: "Submit assignment", ar: "إرسال الواجب" },
  assignment_text_answer: { en: "Written answer", ar: "الإجابة الكتابية" },
  assignment_file_upload: { en: "Upload file (PDF, DOCX, or image)", ar: "رفع ملف (PDF أو DOCX أو صورة)" },
  assignment_grade_feedback: { en: "Grade & feedback", ar: "الدرجة والملاحظات" },
  assignment_your_score: { en: "Your score", ar: "درجتك" },
  assignment_upcoming: { en: "Upcoming", ar: "قادمة" },
  assignment_no_assignments: { en: "No assignments for your class yet.", ar: "لا توجد واجبات لصفك بعد." },
  assignment_open: { en: "Open assignment", ar: "فتح الواجب" },
  assignment_instructions: { en: "Instructions", ar: "التعليمات" },
  assignment_download_attachment: { en: "Download attachment", ar: "تحميل المرفق" },
  assignment_download_submission: { en: "Download your file", ar: "تحميل ملفك" },
  assignment_your_submission: { en: "Your submission", ar: "إرسالك" },
  assignment_text_placeholder: { en: "Type your answer here…", ar: "اكتب إجابتك هنا…" },
  assignment_submit_required: { en: "Please add text or upload a file.", ar: "يرجى إضافة نص أو رفع ملف." },
  assignment_submit_success: { en: "Assignment submitted successfully.", ar: "تم إرسال الواجب بنجاح." },
  assignment_not_found: { en: "Assignment not found", ar: "الواجب غير موجود" },
  parent_assignments_title: { en: "Assignments", ar: "الواجبات" },
  parent_assignments_lead: {
    en: "Track upcoming, submitted, missing, and late assignments.",
    ar: "تابع الواجبات القادمة والمُرسلة والناقصة والمتأخرة.",
  },
  assignment_no_upcoming: { en: "No upcoming assignments.", ar: "لا توجد واجبات قادمة." },
  assignment_no_submitted: { en: "No submitted assignments yet.", ar: "لا توجد واجبات مُرسلة بعد." },
  assignment_no_missing: { en: "No missing assignments.", ar: "لا توجد واجبات ناقصة." },
  assignment_no_late: { en: "No late assignments.", ar: "لا توجد واجبات متأخرة." },
  loading: { en: "Loading…", ar: "جارٍ التحميل…" },
  assignment_submitted_file: { en: "Submitted file", ar: "الملف المُرسل" },
  assignment_file_open: { en: "Open file", ar: "عرض الملف" },
  assignment_file_download: { en: "Download", ar: "تحميل الملف" },
  assignment_file_preview: { en: "Preview", ar: "معاينة" },
  assignment_file_preview_title: { en: "File preview", ar: "معاينة الملف" },
  assignment_file_type: { en: "File type", ar: "نوع الملف" },
  assignment_file_size: { en: "File size", ar: "حجم الملف" },
  assignment_file_not_found: { en: "File not found in storage.", ar: "الملف غير موجود في التخزين." },
  assignment_file_signed_url_failed: { en: "Could not open file. Signed URL failed.", ar: "تعذر فتح الملف. فشل إنشاء الرابط المؤقت." },
  assignment_file_permission_denied: { en: "Permission denied to access this file.", ar: "لا تملك صلاحية الوصول إلى هذا الملف." },

  notifications_title: { en: "Notifications", ar: "الإشعارات" },
  notifications_empty: { en: "No notifications yet.", ar: "لا توجد إشعارات بعد." },
  notifications_mark_all_read: { en: "Mark all read", ar: "تعيين الكل كمقروء" },
  notifications_unread: { en: "unread", ar: "غير مقروء" },

  // Parent dashboard (extended)
  parent_hero_instant_lead: {
    en: "Instant view of your child's academic performance and learning progress.",
    ar: "متابعة فورية لأداء ابنكم الأكاديمي والتقدم الدراسي.",
  },
  parent_rec_tier_excellent: { en: "Excellent", ar: "ممتاز" },
  parent_rec_tier_good: { en: "Good", ar: "جيد" },
  parent_rec_tier_support: { en: "Needs support", ar: "يحتاج دعمًا" },
  parent_rec_tier_awaiting: { en: "Awaiting data", ar: "بانتظار البيانات" },
  parent_status_excellent: { en: "Excellent", ar: "ممتاز" },
  parent_status_very_good: { en: "Very Good", ar: "جيد جداً" },
  parent_status_good: { en: "Good", ar: "جيد" },
  parent_status_no_data: { en: "No data yet", ar: "لا توجد بيانات بعد" },
  parent_insight_top_pct: {
    en: "Your child is in the top {n}% of the grade",
    ar: "ابنكم ضمن أفضل {n}% من الصف",
  },
  parent_insight_avg_score: {
    en: "Average score {n}%",
    ar: "متوسط الدرجات {n}%",
  },
  parent_insight_all_lessons: {
    en: "Completed all available lessons",
    ar: "أكمل جميع الدروس المتاحة",
  },
  parent_insight_recent_cert: {
    en: "Earned a new certificate this week",
    ar: "حصل على شهادة جديدة هذا الأسبوع",
  },
  parent_insight_progress: {
    en: "Overall progress {n}%",
    ar: "التقدّم الدراسي {n}%",
  },
  parent_rec_no_data: {
    en: "Recommendations will appear after your child completes their first quiz.",
    ar: "ستظهر التوصيات بعد إكمال ابنكم لأول اختبار.",
  },
  parent_rec_excellent: {
    en: "Your child is performing excellently and is encouraged to maintain this level.",
    ar: "الطالب يحقق أداءً ممتازًا ويُنصح بالاستمرار على نفس المستوى.",
  },
  parent_rec_good: {
    en: "Good performance. We recommend extra review before upcoming assessments.",
    ar: "أداء جيد، ويوصى بزيادة المراجعة قبل الاختبارات القادمة.",
  },
  parent_rec_support: {
    en: "Your child needs additional follow-up and academic support.",
    ar: "يحتاج الطالب إلى متابعة إضافية ودعم أكاديمي.",
  },
  parent_assign_submitted: { en: "Submitted", ar: "تم التسليم" },
  parent_assign_upcoming: { en: "Upcoming", ar: "قادمة" },
  parent_assign_overdue: { en: "Overdue", ar: "متأخرة" },
  parent_tap_view_details: { en: "Tap to view details", ar: "اضغط لعرض التفاصيل" },
  parent_view_grade_lessons: { en: "view grade lessons", ar: "عرض دروس الصف" },
  parent_go_to_section: { en: "go to section", ar: "الانتقال إلى القسم" },
  parent_based_on_avg: {
    en: "Based on average quiz score",
    ar: "بناءً على متوسط درجات الاختبارات",
  },
  chart_score_label: { en: "Score", ar: "الدرجة" },
  checking_access: { en: "Checking access…", ar: "جارٍ التحقق من الوصول…" },
  verifying_access: { en: "Verifying your access…", ar: "جارٍ التحقق من صلاحيتك…" },
  dashboard_label: { en: "Dashboard", ar: "لوحة التحكم" },
  guide_not_found: { en: "Guide not found.", ar: "الدليل غير موجود." },
  announcement_not_found: { en: "Announcement not found.", ar: "الإعلان غير موجود." },
  parent_signed_in_multi: {
    en: "Signed in to view your children's learning progress.",
    ar: "أنت مسجّل الدخول لمتابعة تقدّم أبنائك التعليمي.",
  },
  parent_signed_in_single: {
    en: "Signed in to view your child's learning progress.",
    ar: "أنت مسجّل الدخول لمتابعة تقدّم ابنك/ابنتك التعليمي.",
  },
  parent_ui_preview_lead: {
    en: "UI preview (dev only) — mock student data",
    ar: "معاينة الواجهة (تطوير فقط) — بيانات تجريبية",
  },
  parent_smart_recommendation: {
    en: "Smart Parent Recommendation",
    ar: "توصية ذكية لولي الأمر",
  },
  parent_academic_performance: { en: "Academic Performance", ar: "الأداء الأكاديمي" },
  parent_quiz_trend_lead: {
    en: "Quiz score trend over time.",
    ar: "اتجاه درجات الاختبارات عبر الزمن.",
  },
  parent_current_score: { en: "Current score", ar: "الدرجة الحالية" },
  parent_performance_trend_single: {
    en: "Performance trends will appear after additional assessments are added.",
    ar: "سيظهر تطور الأداء بعد إضافة اختبارات إضافية",
  },
  parent_summary_title: { en: "Parent Summary", ar: "ملخص ولي الأمر" },
  parent_summary_empty: {
    en: "Insights will appear as your child completes lessons and quizzes.",
    ar: "ستظهر الملخصات عند إكمال الدروس والاختبارات.",
  },
  parent_academic_progress: { en: "Academic Progress", ar: "التقدم الدراسي" },
  parent_certificates_earned: { en: "Certificates Earned", ar: "الشهادات المكتسبة" },
  parent_lessons_completed: { en: "Lessons Completed", ar: "الدروس المكتملة" },
  parent_average_score: { en: "Average Score", ar: "متوسط الدرجات" },
  parent_rank_grade: { en: "Rank in Grade", ar: "الترتيب في الصف" },
  parent_rank_islamic: { en: "Rank in Islamic Group", ar: "الترتيب في الإسلامية" },
  parent_current_rank: { en: "Current rank", ar: "المركز الحالي" },
  parent_achievements_badges: { en: "Achievements & Badges", ar: "الإنجازات والشارات" },
  parent_badge_locked: { en: "Locked", ar: "مقفلة" },
  parent_latest_certificates: { en: "Latest Certificates", ar: "أحدث الشهادات" },
  parent_no_certificates: {
    en: "No certificates yet. Completed lesson quizzes will appear here.",
    ar: "لا توجد شهادات بعد. ستظهر هنا عند إتمام اختبارات الدروس.",
  },
  parent_view_certificate: { en: "View certificate", ar: "عرض الشهادة" },
  parent_certificate_load_error: {
    en: "The certificate could not be loaded. Please try again.",
    ar: "تعذر تحميل الشهادة. حاول مرة أخرى.",
  },
  parent_certificate_details: { en: "Certificate Details", ar: "تفاصيل الشهادة" },
  parent_lesson_label: { en: "Lesson", ar: "الدرس" },
  parent_date_label: { en: "Date", ar: "التاريخ" },
  parent_score_label: { en: "Score", ar: "الدرجة" },
  parent_certificate_id: { en: "Certificate ID", ar: "رقم الشهادة" },
  parent_recent_activity: { en: "Recent Activity", ar: "النشاط الأخير" },
  parent_recent_activity_lead: {
    en: "Quiz completions, certificates, and badge milestones.",
    ar: "إتمام الاختبارات والشهادات وإنجازات الشارات.",
  },
  parent_activity_empty: {
    en: "Activity will appear here once quizzes are submitted.",
    ar: "سيظهر النشاط هنا بعد إرسال الاختبارات.",
  },
  parent_badge_unlocked: { en: "Badge unlocked", ar: "شارة مفتوحة" },
  parent_certificate_earned: { en: "Certificate earned", ar: "شهادة مكتسبة" },
  parent_quiz_completed: { en: "Quiz completed", ar: "اختبار مكتمل" },
  parent_progress_label: { en: "Progress", ar: "التقدّم" },
  parent_select_child: { en: "Select child", ar: "اختر الطفل" },
  parent_your_children: { en: "Your children", ar: "أبناؤك" },
  parent_linked_children: { en: "Linked children", ar: "الأبناء المرتبطون" },
  parent_quiz_trend_empty: {
    en: "Quiz scores will appear here after the first submission.",
    ar: "ستظهر درجات الاختبارات هنا بعد أول إرسال.",
  },
} satisfies Dict;

export type TKey = keyof typeof t;

const LOCALE_OVERRIDES: Record<Lang, Record<string, string>> = {
  en: {},
  ar: {},
  fr,
  de,
  ur,
  zh,
};

function translate(key: TKey, lang: Lang): string {
  const override = LOCALE_OVERRIDES[lang]?.[key];
  if (override) return override;
  if (lang === "ar") return t[key].ar;
  if (lang === "en") return t[key].en;
  return t[key].en || t[key].ar;
}

export function translateKey(key: TKey, lang: Lang): string {
  return translate(key, lang);
}

export function interpolateTr(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

export type BiFieldMeta = {
  lessonId?: string;
  fieldName?: string;
  contentType?: EducationalContentType;
};

interface I18nCtx {
  lang: Lang;
  locale: ContentLocale;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  toggle: () => void;
  tr: (key: TKey) => string;
  /** Translate with `{name}` placeholder substitution. */
  trf: (key: TKey, vars: Record<string, string | number>) => string;
  /** Pick lesson/CMS text; dynamically translates for fr/de/ur/zh. */
  bi: (text?: Bi | null, meta?: BiFieldMeta) => string;
  /** Safe variant when bilingual text may be undefined. */
  biMaybe: (text?: Bi | null, meta?: BiFieldMeta) => string;
  /** Number of in-flight content translations (for loading UI). */
  contentTranslating: number;
  /** True when translation API could not produce target-language text. */
  translationUnavailable: boolean;
  /** Scope lesson/quiz cache keys to a lesson id. */
  setLessonScope: (lessonId: string | null) => void;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    typeof window === "undefined" ? "ar" : resolveGuestLanguage(),
  );
  const [contentRev, setContentRev] = useState(0);
  const [contentTranslating, setContentTranslating] = useState(0);
  const [translationUnavailable, setTranslationUnavailable] = useState(false);
  const lessonScopeRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user) {
        const profileLang = await applyLanguageForUser(data.user.id);
        if (!cancelled) setLangState(profileLang);
        return;
      }
      if (!cancelled) setLangState(resolveGuestLanguage());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onTranslationAvailabilityChange((available) => {
      setTranslationUnavailable(!available);
    });
  }, []);

  useEffect(() => {
    return initEducationalTranslationScheduler(
      () => {
        setContentRev((v) => v + 1);
        if (hasSuccessfulEducationalTranslations()) {
          setTranslationUnavailable(false);
        }
      },
      (active) => setContentTranslating(active),
    );
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const dir = langDir(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.body.dir = dir;
  }, [lang]);

  useEffect(() => {
    resetTranslationSession();
    if (!needsDynamicTranslation(lang)) {
      setTranslationUnavailable(false);
    }
    setContentRev((v) => v + 1);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    persistLanguage(l);
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      try {
        await savePreferredLanguage(data.user.id, l);
      } catch (error) {
        console.warn("[setLang profile sync]", error);
      }
    })();
  }, []);

  const setLessonScope = useCallback((lessonId: string | null) => {
    lessonScopeRef.current = lessonId;
  }, []);

  const locale = contentLocale(lang);

  /** Read-only: stored locale, cache, Arabic/English fallback while translating, or machine translation. */
  const bi = useCallback(
    (text?: Bi | null, meta?: BiFieldMeta) => {
      if (!text) return "";

      const stored = resolveStoredBiText(text, lang);
      if (stored) return stored;

      const source = biSourceForTranslation(text, lang);
      if (!source) return biPendingDisplayText(text, lang);

      const lessonId = meta?.lessonId ?? lessonScopeRef.current ?? undefined;
      const fieldName = meta?.fieldName ?? "content";
      const contentType = meta?.contentType ?? "general";

      const cached = getCachedEducationalTranslation({
        lang,
        contentType,
        lessonId,
        fieldName,
        source: source.text,
      });
      if (cached?.trim()) return cached;

      void translateEducationalContent({
        text: source.text,
        targetLanguage: lang,
        sourceLanguage: source.sourceLanguage,
        contentType,
        lessonId,
        fieldName,
      });

      return biPendingDisplayText(text, lang);
    },
    [lang, contentRev],
  );

  const biMaybe = useCallback(
    (text?: Bi | null, meta?: BiFieldMeta) => (text ? bi(text, meta) : ""),
    [bi],
  );

  const value: I18nCtx = {
    lang,
    locale,
    dir: isRtlLang(lang) ? "rtl" : "ltr",
    setLang,
    toggle: () => setLang(lang === "en" ? "ar" : "en"),
    tr: (key) => translate(key, lang),
    trf: (key, vars) => interpolateTr(translate(key, lang), vars),
    bi,
    biMaybe,
    contentTranslating,
    translationUnavailable,
    setLessonScope,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Pin lesson/quiz translation cache to a lesson id for the current page. */
export function useLessonTranslationScope(lessonId: string | undefined) {
  const { setLessonScope } = useI18n();
  useEffect(() => {
    setLessonScope(lessonId ?? null);
    return () => setLessonScope(null);
  }, [lessonId, setLessonScope]);
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
