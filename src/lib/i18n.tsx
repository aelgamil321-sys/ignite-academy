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
import { de, deByEn } from "@/lib/i18n/locales/de";
import { fr, frByEn } from "@/lib/i18n/locales/fr";
import { ur, urByEn } from "@/lib/i18n/locales/ur";
import { zh, zhByEn } from "@/lib/i18n/locales/zh";
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
import {
  resolveLocalizedContent,
  assertSafeReactLocalizedChild,
} from "@/lib/localized-content-resolve";
import { isStrictLessonContentType } from "@/lib/lesson-content-resolve";

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
  cta_signup: { en: "Create Account", ar: "إنشاء حساب" },
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
  student_nav_dashboard: { en: "Student Dashboard", ar: "لوحة الطالب" },
  student_nav_my_lessons: { en: "My Lessons", ar: "دروسي" },
  student_nav_assignments: { en: "Assignments", ar: "الواجبات" },
  student_nav_quizzes: { en: "Quizzes", ar: "الاختبارات" },
  student_nav_resources: { en: "Learning Resources", ar: "المصادر التعليمية" },
  student_nav_videos: { en: "Educational Videos", ar: "فيديوهات تعليمية" },
  student_nav_achievements: { en: "Achievements & Certificates", ar: "الإنجازات والشهادات" },
  student_nav_honor_board: { en: "Honor Board", ar: "لوحة الشرف" },
  student_nav_announcements: { en: "Announcements", ar: "الإعلانات" },
  student_nav_profile: { en: "My Profile", ar: "ملفي الشخصي" },
  student_sign_out: { en: "Sign Out", ar: "تسجيل الخروج" },
  student_dash_open_menu: { en: "Open menu", ar: "فتح القائمة" },
  student_dash_nav_brand: { en: "Your personal learning workspace", ar: "مساحة التعلّم الخاصة بك" },
  student_dash_topbar_lead: { en: "Ignite Islamic Academy", ar: "أكاديمية اجنايت الإسلامية" },
  student_dash_welcome: { en: "Welcome, {name} 👋", ar: "مرحباً، {name} 👋" },
  student_dash_welcome_lead: {
    en: "Ready to continue your learning journey?",
    ar: "جاهز لمواصلة رحلتك التعليمية؟",
  },
  student_dash_kpi_overall_progress: { en: "Overall Progress", ar: "التقدم الإجمالي" },
  student_dash_kpi_completed_lessons: { en: "Completed Lessons", ar: "الدروس المكتملة" },
  student_dash_kpi_avg_quiz: { en: "Average Quiz Score", ar: "متوسط الاختبارات" },
  student_dash_kpi_certificates: { en: "Certificates", ar: "الشهادات" },
  student_dash_kpi_achievements: { en: "Achievements", ar: "الإنجازات" },
  student_dash_continue_learning: { en: "Continue Learning", ar: "متابعة التعلم" },
  student_dash_continue_lesson: { en: "Continue Lesson", ar: "متابعة الدرس" },
  student_dash_no_lesson_in_progress: {
    en: "No lesson in progress right now. Explore your grade lessons to get started.",
    ar: "لا يوجد درس قيد التقدّم حالياً. استكشف دروس صفّك للبدء.",
  },
  student_dash_explore_grade_lessons: { en: "Explore your grade lessons", ar: "استكشف دروس صفك" },
  student_dash_quiz_progress: { en: "Quiz progress", ar: "تقدّم الاختبار" },
  student_dash_needs_attention: { en: "Needs Attention", ar: "يحتاج انتباهك" },
  student_dash_no_urgent_tasks: {
    en: "No urgent tasks right now.",
    ar: "لا توجد مهام عاجلة حالياً",
  },
  student_dash_attention_missing_assignment: { en: "Overdue assignment", ar: "واجب متأخر" },
  student_dash_attention_upcoming_assignment: { en: "Upcoming assignment", ar: "واجب قادم" },
  student_dash_attention_incomplete_lessons: { en: "Incomplete lessons", ar: "دروس غير مكتملة" },
  student_dash_incomplete_lessons_count: {
    en: "{count} lesson(s) not yet completed",
    ar: "{count} درس/دروس لم تُكمل بعد",
  },
  student_dash_quick_actions: { en: "Quick Actions", ar: "إجراءات سريعة" },
  student_dash_academic_progress: { en: "My Academic Progress", ar: "تقدمي الدراسي" },
  student_dash_academic_progress_lead: {
    en: "Progress is based on lesson quizzes submitted for your grade.",
    ar: "يُحسب التقدّم من اختبارات الدروس التي أرسلتها لصفّك.",
  },
  student_dash_academic_lessons: { en: "Lessons completed", ar: "الدروس المكتملة" },
  student_dash_academic_quiz_avg: { en: "Quiz average", ar: "متوسط الاختبارات" },
  student_dash_academic_badge_progress: { en: "Badge progress", ar: "تقدّم الشارات" },
  student_dash_academic_remaining: {
    en: "{count} lesson(s) remaining in your grade.",
    ar: "يتبقى {count} درس/دروس في صفّك.",
  },
  student_dash_academic_all_complete: {
    en: "You have completed all published lessons in your grade.",
    ar: "أكملت جميع الدروس المنشورة في صفّك.",
  },
  student_dash_my_grade: { en: "My Grade", ar: "صفّي" },
  student_dash_browse_lessons: { en: "Browse lessons", ar: "تصفّح الدروس" },
  student_dash_learning_level: { en: "Learning Level", ar: "المستوى التعليمي" },
  student_dash_badges_title: { en: "Achievements & Badges", ar: "الإنجازات والشارات" },
  student_dash_badges_lead: {
    en: "Earn badges automatically as you learn and complete quizzes.",
    ar: "اكسب الشارات تلقائيًا أثناء التعلّم وإتمام الاختبارات.",
  },
  student_dash_badges_unlocked: { en: "Unlocked", ar: "مفتوحة" },
  student_dash_badge_unlocked: { en: "Unlocked", ar: "مفتوحة" },
  student_dash_badge_locked: { en: "Locked", ar: "مقفلة" },
  student_dash_certificates: { en: "Certificates", ar: "الشهادات" },
  student_dash_certificates_empty: {
    en: "No certificates yet. Complete a lesson quiz to earn one.",
    ar: "لا توجد شهادات بعد. أكمل اختبار درس لتحصل على شهادة.",
  },
  student_dash_recent_achievements: { en: "Recent Achievements", ar: "الإنجازات الأخيرة" },
  student_dash_achievements_empty: {
    en: "Submit your first quiz to see achievements here.",
    ar: "أرسل أول اختبار ليظهر إنجازك هنا.",
  },
  student_dash_achievement_certificate: { en: "Certificate earned", ar: "شهادة مكتسبة" },
  student_dash_achievement_quiz: { en: "Quiz submitted", ar: "اختبار مُرسَل" },
  student_my_lessons_complete_profile: {
    en: "Complete your profile to access your grade lessons.",
    ar: "أكمل ملفك الشخصي للوصول إلى دروس صفك.",
  },
  student_profile_lead: {
    en: "View and update your personal details, photo, and class grouping.",
    ar: "عرض وتحديث بياناتك الشخصية والصورة والمجموعة الدراسية.",
  },
  student_profile_identity_title: { en: "Student Profile", ar: "الملف الشخصي" },
  student_profile_academic_identity: { en: "Academic Identity", ar: "الهوية الدراسية" },
  student_profile_personal_details: { en: "Personal Details", ar: "البيانات الشخصية" },
  student_profile_grade_readonly: {
    en: "Your grade is assigned by the academy and cannot be changed here.",
    ar: "يُحدَّد صفّك من قبل الأكاديمية ولا يمكن تغييره من هنا.",
  },
  student_profile_email_new: { en: "New email", ar: "البريد الإلكتروني الجديد" },
  student_profile_email_confirm: { en: "Confirm new email", ar: "تأكيد البريد الجديد" },
  student_profile_email_same: {
    en: "Enter a new email that is different from your current email.",
    ar: "أدخل بريدًا إلكترونيًا جديدًا مختلفًا عن بريدك الحالي.",
  },
  student_profile_email_mismatch: {
    en: "New email and confirmation do not match.",
    ar: "البريد الجديد وتأكيده غير متطابقين.",
  },
  student_profile_email_empty: {
    en: "Enter your new email address.",
    ar: "أدخل عنوان بريدك الإلكتروني الجديد.",
  },
  student_profile_email_updated: {
    en: "Login email updated.",
    ar: "تم تحديث بريد تسجيل الدخول.",
  },
  student_profile_grade_updated: {
    en: "Grade updated.",
    ar: "تم تحديث الصف.",
  },
  student_profile_grade_same: {
    en: "Choose a different grade.",
    ar: "اختر صفًا مختلفًا.",
  },
  student_profile_grade_invalid: {
    en: "Choose a valid grade.",
    ar: "اختر صفًا صالحًا.",
  },
  student_profile_email_confirm_dialog: {
    en: "The new email will become your login email for the platform. Continue?",
    ar: "سيصبح البريد الجديد هو البريد المستخدم لتسجيل الدخول إلى المنصة. هل تريد المتابعة؟",
  },
  student_profile_grade_confirm_dialog: {
    en: "Changing your grade will update the lessons and content available to you. Your previous results will not be deleted. Continue?",
    ar: "سيؤدي تغيير الصف إلى تحديث الدروس والمحتوى الظاهر لك. لن يتم حذف نتائجك السابقة. هل تريد المتابعة؟",
  },
  student_profile_email_change_failed: {
    en: "Could not update your login email. Your current email is unchanged.",
    ar: "تعذّر تحديث بريد تسجيل الدخول. بريدك الحالي لم يتغيّر.",
  },
  student_profile_grade_change_failed: {
    en: "Could not update your grade. Your current grade is unchanged.",
    ar: "تعذّر تحديث الصف. صفّك الحالي لم يتغيّر.",
  },
  student_profile_progress_summary: { en: "Progress Summary", ar: "ملخص التقدّم" },
  student_profile_progress_summary_lead: {
    en: "A quick snapshot of your learning progress.",
    ar: "نظرة سريعة على تقدّمك التعليمي.",
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
  parent_nav_dashboard: { en: "Parent Dashboard", ar: "لوحة ولي الأمر" },
  parent_nav_child_progress: { en: "Child Progress", ar: "تقدم الأبناء" },
  parent_nav_assignments: { en: "Assignments", ar: "الواجبات" },
  parent_nav_achievements: { en: "Certificates & Achievements", ar: "الشهادات والإنجازات" },
  parent_nav_announcements: { en: "Announcements", ar: "الإعلانات" },
  parent_nav_guides: { en: "Parent Guides", ar: "دليل ولي الأمر" },
  parent_workspace_announcements_lead: {
    en: "School updates and important notices.",
    ar: "مستجدات المدرسة والإشعارات المهمة.",
  },
  parent_workspace_guides_lead: {
    en: "Resources and tips to support your child's learning at home.",
    ar: "مصادر ونصائح لدعم تعلّم ابنك/ابنتك في المنزل.",
  },
  parent_workspace_guides_empty: {
    en: "No parent guides published yet.",
    ar: "لا توجد أدلة لولي الأمر منشورة بعد.",
  },
  parent_workspace_back_announcements: {
    en: "Back to announcements",
    ar: "العودة إلى الإعلانات",
  },
  parent_workspace_back_guides: {
    en: "Back to parent guides",
    ar: "العودة إلى دليل ولي الأمر",
  },
  parent_workspace_public_announcements_link: {
    en: "View public announcements page",
    ar: "عرض صفحة الإعلانات العامة",
  },
  parent_workspace_public_guides_link: {
    en: "View public Parent Corner",
    ar: "عرض ركن الوالدين العام",
  },
  parent_nav_profile: { en: "Profile & Children", ar: "الملف الشخصي والأبناء" },
  parent_nav_coming_soon: {
    en: "Available in a future workspace update",
    ar: "متاح في تحديث لاحق لمساحة العمل",
  },
  parent_sign_out: { en: "Sign Out", ar: "تسجيل الخروج" },
  parent_dash_open_menu: { en: "Open menu", ar: "فتح القائمة" },
  parent_dash_nav_brand: {
    en: "Your family learning monitor",
    ar: "مراقبة تعلّم أبنائك",
  },
  parent_dash_topbar_lead: { en: "Ignite Islamic Academy", ar: "أكاديمية اجنايت الإسلامية" },
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
  parent_link_code_reg_label: { en: "Parent Link Code", ar: "رمز ربط ولي الأمر" },
  parent_link_code_hint: {
    en: "Enter the code from your child's student dashboard.",
    ar: "أدخل الرمز من لوحة الطالب.",
  },
  parent_link_code_title: { en: "Parent Link Code", ar: "رمز ربط ولي الأمر" },
  parent_link_code_note: {
    en: "Share this code only with your parent so they can link your account in the parent portal.",
    ar: "شارك هذا الكود مع ولي أمرك فقط لربط حسابك في بوابة ولي الأمر.",
  },
  parent_link_code_purpose: {
    en: "Used to connect a parent account to your student record. This is not your school Student ID.",
    ar: "يُستخدم لربط حساب ولي الأمر بسجلك الطلابي. هذا ليس رقم الطالب المدرسي.",
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
  parent_settings_profile_heading: { en: "Parent Profile", ar: "ملف ولي الأمر" },
  parent_settings_role_label: { en: "Account role", ar: "دور الحساب" },
  parent_settings_my_children_title: { en: "My Children", ar: "أبنائي" },
  parent_settings_children_empty: {
    en: "No children linked yet. Use a Parent Link Code below to connect your child.",
    ar: "لا يوجد أبناء مرتبطون بعد. استخدم رمز ربط ولي الأمر أدناه لربط طفلك.",
  },
  parent_settings_view_progress: { en: "View Progress", ar: "عرض التقدم" },
  parent_settings_link_child_title: { en: "Link Another Child", ar: "ربط طفل آخر" },
  parent_settings_link_code_instruction: {
    en: "Enter the Parent Link Code shown in your child's student profile.",
    ar: "أدخل رمز ربط ولي الأمر الظاهر في ملف الطالب.",
  },
  parent_settings_preferences_title: { en: "Preferences", ar: "التفضيلات" },
  parent_settings_preferences_lead: {
    en: "Choose your preferred language for the parent workspace.",
    ar: "اختر لغتك المفضلة في مساحة عمل ولي الأمر.",
  },
  parent_link_code_error_generic: {
    en: "We could not complete that request. Please check your connection and try again.",
    ar: "تعذّر إتمام الطلب. يرجى التحقق من الاتصال والمحاولة مرة أخرى.",
  },
  parent_link_code_error_auth: {
    en: "Please sign in again with your parent account to link a child.",
    ar: "يرجى تسجيل الدخول مرة أخرى بحساب ولي الأمر لربط الطفل.",
  },

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
  admin_role_label: { en: "Administrator", ar: "مسؤول النظام" },
  admin_nav_brand: { en: "Ignite Management", ar: "إدارة اجنايت" },
  admin_nav_home: { en: "Admin Home", ar: "الرئيسية" },
  admin_nav_dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  admin_nav_teaching: { en: "Teaching", ar: "التدريس" },
  admin_nav_weekly_planning: { en: "Weekly Planning", ar: "التخطيط الأسبوعي" },
  admin_nav_students: { en: "Students", ar: "الطلاب" },
  admin_nav_teachers: { en: "Teachers", ar: "المعلمون" },
  admin_nav_classes: { en: "Classes", ar: "الصفوف والشعب" },
  admin_nav_content: { en: "Content", ar: "المحتوى" },
  admin_nav_analytics: { en: "Analytics", ar: "التحليلات" },
  admin_nav_grades: { en: "Grades", ar: "الصفوف" },
  admin_nav_parents: { en: "Parents", ar: "أولياء الأمور" },
  admin_nav_honor_board: { en: "Honor Board", ar: "لوحة الشرف" },
  admin_nav_reports: { en: "Reports", ar: "التقارير" },
  admin_nav_announcements: { en: "Announcements", ar: "الإعلانات" },
  admin_nav_add_lesson: { en: "Add Lesson", ar: "إضافة درس" },
  admin_nav_lessons: { en: "Lessons", ar: "الدروس" },
  admin_nav_quizzes: { en: "Quizzes", ar: "الاختبارات" },
  admin_nav_quiz_submissions: { en: "Quiz Submissions", ar: "إرسالات الاختبارات" },
  admin_nav_assignments: { en: "Assignments", ar: "الواجبات" },
  admin_nav_dept_weekly_planning: { en: "Department Weekly Planning", ar: "متابعة التخطيط الأسبوعي" },
  admin_nav_main: { en: "Main navigation", ar: "التنقل الرئيسي" },
  admin_nav_group_main: { en: "Main", ar: "الرئيسية" },
  admin_nav_group_teaching: { en: "Teaching", ar: "التدريس" },
  admin_nav_group_administration: { en: "Administration", ar: "الإدارة" },
  admin_nav_management: { en: "Management", ar: "الإدارة" },
  admin_nav_group_management: { en: "Management", ar: "الإدارة" },
  admin_nav_group_cms: { en: "CMS tools", ar: "أدوات إدارة المحتوى" },
  admin_cms_manage_grades: { en: "Manage grades", ar: "إدارة الصفوف" },
  admin_cms_manage_units: { en: "Manage units", ar: "إدارة الوحدات" },
  admin_cms_manage_users: { en: "Manage users", ar: "إدارة المستخدمين" },
  admin_cms_parent_links: { en: "Parent links", ar: "ربط أولياء الأمور" },
  admin_home_title: { en: "Admin Home", ar: "الرئيسية — الإدارة" },
  admin_home_lead_short: {
    en: "Academy overview, stages, curriculum areas, announcements, and analytics entry.",
    ar: "نظرة على الأكاديمية، المراحل، المحاور، الإعلانات، ومدخل التحليلات.",
  },
  admin_home_welcome: { en: "Welcome, {name}", ar: "مرحباً، {name}" },
  admin_home_intro: {
    en: "Manage Ignite Islamic Academy from one place — teaching content, classes, staff, weekly planning, and school-wide reports.",
    ar: "أدر أكاديمية اجنايت الإسلامية من مكان واحد — المحتوى التعليمي، الصفوف، المعلمين، التخطيط الأسبوعي، وتقارير المدرسة.",
  },
  admin_home_analytics_title: { en: "Analytics & Comparisons", ar: "التحليلات والمقارنات" },
  admin_home_analytics_lead: {
    en: "School-wide insights and comparisons across grades, sections, teachers, and planning completion.",
    ar: "رؤى على مستوى المدرسة ومقارنات بين الصفوف والشعب والمعلمين وإنجاز التخطيط.",
  },
  admin_home_analytics_bullets: {
    en: "Whole-school overview|Grade comparison|Section comparison|Teacher comparison|Student performance trends|Weekly planning completion overview",
    ar: "نظرة على المدرسة كاملة|مقارنة الصفوف|مقارنة الشعب|مقارنة المعلمين|اتجاهات أداء الطلاب|نظرة على إنجاز التخطيط الأسبوعي",
  },
  admin_home_analytics_cta: { en: "Open analytics", ar: "فتح التحليلات" },
  admin_home_analytics_eyebrow: { en: "School insights", ar: "رؤى المدرسة" },
  admin_home_analytics_loading: { en: "Loading analytics preview…", ar: "جارٍ تحميل معاينة التحليلات…" },
  admin_home_analytics_students: { en: "Students", ar: "الطلاب" },
  admin_home_analytics_avg_score: { en: "Average quiz score", ar: "متوسط درجات الاختبار" },
  admin_home_analytics_submissions: { en: "Quiz submissions", ar: "إرسالات الاختبارات" },
  admin_home_analytics_certificates: { en: "Certificates", ar: "الشهادات" },
  admin_home_analytics_islamic_a: { en: "Islamic A average", ar: "متوسط المجموعة الإسلامية أ" },
  admin_home_analytics_islamic_b: { en: "Islamic B average", ar: "متوسط المجموعة الإسلامية ب" },
  admin_home_analytics_grade_chart: { en: "Grade comparison (avg. quiz score)", ar: "مقارنة الصفوف (متوسط الاختبارات)" },
  admin_home_analytics_empty: { en: "No analytics data available yet.", ar: "لا تتوفر بيانات تحليلات بعد." },
  admin_home_analytics_load_error: {
    en: "Could not load analytics preview.",
    ar: "تعذّر تحميل معاينة التحليلات.",
  },
  admin_home_add_announcement: { en: "Add Announcement", ar: "إضافة إعلان" },
  admin_ann_target_grade: { en: "Target grade", ar: "الصف المستهدف" },
  admin_ann_audience: { en: "Audience", ar: "الجمهور" },
  admin_ann_date: { en: "Date", ar: "التاريخ" },
  admin_ann_all_grades: { en: "All grades", ar: "جميع الصفوف" },
  admin_ann_creator: { en: "Author", ar: "المُنشئ" },
  admin_ann_creator_unavailable: {
    en: "Creator unavailable — legacy announcement",
    ar: "المُنشئ غير متوفر — إعلان سابق",
  },
  admin_ann_target_section: { en: "Target section", ar: "الشعبة المستهدفة" },
  admin_ann_all_sections: { en: "All sections", ar: "جميع الشعب" },
  admin_ann_topic: { en: "Topic", ar: "الموضوع" },
  admin_ann_section_unavailable: {
    en: "All sections",
    ar: "جميع الشعب",
  },
  admin_home_parent_directory_title: { en: "Parent Directory", ar: "دليل أولياء الأمور" },
  admin_home_parent_directory_lead: {
    en: "Registered parents, linked children, and student grade/section details.",
    ar: "أولياء الأمور المسجلين والأطفال المرتبطين وتفاصيل الصف والشعبة.",
  },
  admin_home_parent_directory_cta: { en: "Open parent directory", ar: "فتح دليل أولياء الأمور" },
  admin_parents_loading: { en: "Loading parent directory…", ar: "جارٍ تحميل دليل أولياء الأمور…" },
  admin_parents_empty: { en: "No registered parents found.", ar: "لا يوجد أولياء أمور مسجلين." },
  admin_parents_children_count: { en: "linked children", ar: "أطفال مرتبطين" },
  admin_parents_no_children: { en: "No linked children.", ar: "لا يوجد أطفال مرتبطين." },
  admin_home_honor_board_title: { en: "Honor Board", ar: "لوحة الشرف" },
  admin_home_honor_board_lead: {
    en: "Student rankings by quiz performance, certificates, and grade champions.",
    ar: "ترتيب الطلاب حسب أداء الاختبارات والشهادات وأبطال الصفوف.",
  },
  admin_home_honor_board_cta: { en: "Open honor board", ar: "فتح لوحة الشرف" },
  admin_content_owned_by: { en: "Created by {name}", ar: "أنشأه {name}" },
  admin_content_view: { en: "View", ar: "عرض" },
  admin_content_view_quiz: { en: "View Quiz", ar: "عرض الاختبار" },
  admin_content_view_assignment: { en: "View Assignment", ar: "عرض الواجب" },
  admin_content_view_announcement: { en: "View Announcement", ar: "عرض الإعلان" },
  admin_content_view_video: { en: "View Video", ar: "عرض الفيديو" },
  admin_content_view_file: { en: "View File", ar: "عرض الملف" },
  admin_content_view_resource: { en: "View Resource", ar: "عرض المورد" },
  admin_content_view_lesson: { en: "View full lesson", ar: "عرض الدرس كاملاً" },
  admin_hof_filters_title: { en: "Filter rankings", ar: "تصفية الترتيب" },
  admin_hof_section_filter: { en: "Section", ar: "الشعبة" },
  admin_parents_progress: { en: "Lesson progress", ar: "تقدم الدروس" },
  admin_parents_progress_unavailable: { en: "Progress not available", ar: "التقدم غير متاح" },
  admin_parents_quiz_avg: { en: "Quiz avg.", ar: "متوسط الاختبارات" },
  admin_students_title: { en: "Student Directory", ar: "دليل الطلاب" },
  admin_students_lead: {
    en: "Search and review student profiles, progress, quiz performance, and certificates.",
    ar: "ابحث واطّلع على ملفات الطلاب وتقدمهم وأداء الاختبارات والشهادات.",
  },
  admin_students_loading: { en: "Loading students…", ar: "جارٍ تحميل الطلاب…" },
  admin_students_empty: { en: "No students match your filters.", ar: "لا يوجد طلاب مطابقون للفلاتر." },
  admin_students_none_yet: { en: "No students yet", ar: "لا يوجد طلاب بعد" },
  admin_students_load_error: {
    en: "Could not load students.",
    ar: "تعذّر تحميل الطلاب.",
  },
  admin_students_search_placeholder: {
    en: "Search by name, email, student ID, or link code…",
    ar: "ابحث بالاسم أو البريد أو معرف الطالب أو رمز الربط…",
  },
  admin_students_filter_all: { en: "All", ar: "الكل" },
  admin_students_count: { en: "Showing", ar: "عرض" },
  admin_students_col_id: { en: "Student ID", ar: "معرف الطالب" },
  admin_students_col_progress: { en: "Progress", ar: "التقدم" },
  admin_students_col_quiz_avg: { en: "Quiz avg.", ar: "متوسط الاختبارات" },
  admin_students_col_certificates: { en: "Certificates", ar: "الشهادات" },
  admin_students_col_status: { en: "Account", ar: "الحساب" },
  admin_students_detail_title: { en: "Student profile", ar: "ملف الطالب" },
  admin_students_detail_loading: { en: "Loading student profile…", ar: "جارٍ تحميل ملف الطالب…" },
  admin_students_not_found: { en: "Student not found.", ar: "الطالب غير موجود." },
  admin_students_back: { en: "Back to student directory", ar: "العودة إلى دليل الطلاب" },
  admin_students_no_certificates: { en: "No certificates earned yet.", ar: "لا توجد شهادات مكتسبة بعد." },
  admin_students_parent_links: { en: "Linked parents", ar: "أولياء الأمور المرتبطون" },
  admin_students_no_parents: { en: "No linked parents.", ar: "لا يوجد أولياء أمور مرتبطون." },
  admin_teachers_title: { en: "Teacher Directory", ar: "دليل المعلمين" },
  admin_teachers_lead: {
    en: "Search teachers, review teaching scope, and track content activity.",
    ar: "ابحث عن المعلمين وراجع نطاق التدريس ونشاط المحتوى.",
  },
  admin_teachers_manage_title: { en: "Manage teachers", ar: "إدارة المعلمين" },
  admin_teachers_manage_lead: {
    en: "Assign teacher roles and manage grade, section, and Islamic group teaching scope.",
    ar: "عيّن صلاحيات المعلمين وأدر نطاق التدريس حسب الصف والشعبة والمجموعة الإسلامية.",
  },
  admin_teachers_loading: { en: "Loading teachers…", ar: "جارٍ تحميل المعلمين…" },
  admin_teachers_empty: { en: "No teachers match your filters.", ar: "لا يوجد معلمون مطابقون للفلاتر." },
  admin_teachers_search_placeholder: {
    en: "Search by name, email, or user ID…",
    ar: "ابحث بالاسم أو البريد أو معرف المستخدم…",
  },
  admin_teachers_filter_all: { en: "All", ar: "الكل" },
  admin_teachers_count: { en: "Showing", ar: "عرض" },
  admin_teachers_col_id: { en: "Teacher ID", ar: "معرف المعلم" },
  admin_teachers_col_role: { en: "Role", ar: "الدور" },
  admin_teachers_col_assignments: { en: "Assignments", ar: "الواجبات" },
  admin_teachers_col_announcements: { en: "Announcements", ar: "الإعلانات" },
  admin_teachers_col_weekly_plans: { en: "Weekly plans", ar: "الخطط الأسبوعية" },
  admin_teachers_col_lessons: { en: "Lessons created", ar: "الدروس المنشأة" },
  admin_teachers_col_status: { en: "Account", ar: "الحساب" },
  admin_teachers_complete: { en: "complete", ar: "مكتمل" },
  admin_teachers_lead_teacher: { en: "Lead teacher", ar: "معلم رئيسي" },
  admin_teachers_manage_link: { en: "Manage teachers", ar: "إدارة المعلمين" },
  admin_teachers_detail_title: { en: "Teacher profile", ar: "ملف المعلم" },
  admin_teachers_detail_loading: { en: "Loading teacher profile…", ar: "جارٍ تحميل ملف المعلم…" },
  admin_teachers_not_found: { en: "Teacher not found.", ar: "المعلم غير موجود." },
  admin_teachers_back: { en: "Back to teacher directory", ar: "العودة إلى دليل المعلمين" },
  admin_teachers_teaching_scope: { en: "Teaching assignments", ar: "تكليفات التدريس" },
  admin_teachers_no_assignments: { en: "No grade assignments yet.", ar: "لا توجد تكليفات صفوف بعد." },
  admin_teachers_activity_title: { en: "Teacher activity", ar: "نشاط المعلم" },
  admin_teachers_activity_note: {
    en: "Content created by this teacher. Student quiz performance is not shown here.",
    ar: "المحتوى الذي أنشأه هذا المعلم. لا يُعرض هنا أداء الطلاب في الاختبارات.",
  },
  admin_teachers_wp_not_started: { en: "Not started", ar: "لم يبدأ" },
  admin_teachers_wp_in_progress: { en: "In progress", ar: "قيد التنفيذ" },
  admin_teachers_wp_complete: { en: "Complete", ar: "مكتمل" },
  admin_teachers_recent_activity: { en: "Recent activity", ar: "النشاط الأخير" },
  admin_teachers_no_activity: { en: "No recent teacher activity recorded.", ar: "لا يوجد نشاط حديث مسجّل للمعلم." },
  admin_teachers_joined: { en: "Joined", ar: "تاريخ الانضمام" },
  admin_teachers_activity_assignment: { en: "Assignment", ar: "واجب" },
  admin_teachers_activity_announcement: { en: "Announcement", ar: "إعلان" },
  admin_teachers_activity_weekly_plan: { en: "Weekly plan", ar: "خطة أسبوعية" },
  admin_content_title: { en: "Content Management", ar: "إدارة المحتوى" },
  admin_content_lead: {
    en: "Manage lessons, quizzes, assignments, announcements, and uploaded resources from one place.",
    ar: "أدر الدروس والاختبارات والواجبات والإعلانات والموارد المرفوعة من مكان واحد.",
  },
  admin_content_loading: { en: "Loading content summary…", ar: "جارٍ تحميل ملخص المحتوى…" },
  admin_content_lessons_title: { en: "Lessons", ar: "الدروس" },
  admin_content_lessons_desc: {
    en: "Create, edit, and publish lesson content.",
    ar: "أنشئ محتوى الدروس وحرّره وانشره.",
  },
  admin_content_total_lessons: { en: "Total lessons", ar: "إجمالي الدروس" },
  admin_content_published_lessons: { en: "Published", ar: "منشور" },
  admin_content_manage_lessons: { en: "Manage lessons", ar: "إدارة الدروس" },
  admin_content_add_lesson: { en: "Add lesson", ar: "إضافة درس" },
  admin_content_quizzes_title: { en: "Quizzes", ar: "الاختبارات" },
  admin_content_quizzes_desc: {
    en: "Manage lesson quiz questions and review student submissions.",
    ar: "أدر أسئلة اختبارات الدروس وراجع إرسالات الطلاب.",
  },
  admin_content_lessons_with_quiz: { en: "Lessons with quiz", ar: "دروس باختبار" },
  admin_content_quiz_submissions: { en: "Quiz submissions", ar: "إرسالات الاختبارات" },
  admin_content_manage_quizzes: { en: "Manage quizzes", ar: "إدارة الاختبارات" },
  admin_content_assignments_title: { en: "Assignments", ar: "الواجبات" },
  admin_content_assignments_desc: {
    en: "Create electronic assignments and review student submissions.",
    ar: "أنشئ الواجبات الإلكترونية وراجع إرسالات الطلاب.",
  },
  admin_content_total_assignments: { en: "Total assignments", ar: "إجمالي الواجبات" },
  admin_content_manage_assignments: { en: "Manage assignments", ar: "إدارة الواجبات" },
  admin_content_announcements_title: { en: "Announcements", ar: "الإعلانات" },
  admin_content_announcements_desc: {
    en: "Publish targeted announcements with audience, grade, section, and topic.",
    ar: "انشر الإعلانات المستهدفة حسب الجمهور والصف والشعبة والموضوع.",
  },
  admin_content_announcements: { en: "Announcements", ar: "الإعلانات" },
  admin_content_published_announcements: { en: "Published", ar: "منشور" },
  admin_content_manage_announcements: { en: "Manage announcements", ar: "إدارة الإعلانات" },
  admin_content_add_announcement: { en: "Add announcement", ar: "إضافة إعلان" },
  admin_content_resources_title: { en: "Resources", ar: "الموارد" },
  admin_content_resources_desc: {
    en: "Manage uploaded files, lesson attachments, and standalone videos.",
    ar: "أدر الملفات المرفوعة ومرفقات الدروس والفيديوهات المنفصلة.",
  },
  admin_content_files: { en: "Files", ar: "الملفات" },
  admin_content_videos: { en: "Videos", ar: "الفيديوهات" },
  admin_content_published_resources: { en: "Published", ar: "منشور" },
  admin_content_manage_resources: { en: "Manage resources", ar: "إدارة الموارد" },
  admin_content_upload_file: { en: "Upload file", ar: "رفع ملف" },
  admin_content_add_video: { en: "Add video", ar: "إضافة فيديو" },
  admin_content_legacy_note: {
    en: "Legacy CMS tools remain available through the links above. Advanced grade and unit tools are still under Admin Home → CMS sidebar.",
    ar: "تظل أدوات نظام إدارة المحتوى الحالية متاحة عبر الروابط أعلاه. أدوات الصفوف والوحدات المتقدمة ما زالت ضمن الصفحة الرئيسية للإدارة → الشريط الجانبي.",
  },
  nav_logout: { en: "Log out", ar: "تسجيل الخروج" },
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
  auth_login: { en: "Sign In", ar: "تسجيل الدخول" },
  auth_create_account: { en: "Create Account", ar: "إنشاء حساب" },
  auth_gateway_lead: {
    en: "Sign in or create an account to access the academy.",
    ar: "سجّل الدخول أو أنشئ حسابًا للوصول إلى الأكاديمية.",
  },
  auth_choose_account_type: { en: "Choose account type", ar: "اختر نوع الحساب" },
  auth_choose_account_type_lead: {
    en: "Select the type of account you want to create.",
    ar: "اختر نوع الحساب الذي تريد إنشاءه.",
  },
  auth_role_student: { en: "Student", ar: "طالب" },
  auth_role_teacher: { en: "Teacher", ar: "معلم" },
  auth_role_parent: { en: "Parent", ar: "ولي أمر" },
  auth_role_admin: { en: "Admin", ar: "إداري" },
  auth_role_student_desc: {
    en: "Access lessons, quizzes, and track your progress.",
    ar: "الوصول إلى الدروس والاختبارات ومتابعة التقدّم.",
  },
  auth_role_teacher_desc: {
    en: "Request a teacher account for review by the school.",
    ar: "طلب حساب معلم لمراجعته من قبل المدرسة.",
  },
  auth_role_parent_desc: {
    en: "Follow your child's learning and achievements.",
    ar: "متابعة تعلّم طفلك وإنجازاته.",
  },
  auth_role_admin_desc: {
    en: "School administration access.",
    ar: "وصول إدارة المدرسة.",
  },
  auth_back_to_auth_choice: {
    en: "Back to Sign In / Create Account",
    ar: "العودة إلى تسجيل الدخول / إنشاء حساب",
  },
  auth_back_to_role_chooser: {
    en: "Back to account type selection",
    ar: "العودة إلى اختيار نوع الحساب",
  },
  auth_admin_requires_authorization: {
    en: "Admin accounts require authorization from an existing school administrator. New admin access cannot be created from this page.",
    ar: "حسابات الإدارة تتطلب تفويضًا من مسؤول مدرسة قائم. لا يمكن إنشاء وصول إداري جديد من هذه الصفحة.",
  },
  auth_admin_sign_in_link: { en: "Go to admin sign in", ar: "الانتقال إلى دخول الإدارة" },
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
  teacher_subject_islamic_education: { en: "Islamic Education", ar: "التربية الإسلامية" },
  teacher_subject_quran: { en: "Qur'an", ar: "القرآن الكريم" },
  teacher_lesson_subject: { en: "Subject", ar: "المادة" },
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
  teacher_dash_hero_lead: {
    en: "Manage your classes, follow your students, and access your teaching tools.",
    ar: "هنا يمكنك إدارة صفوفك ومتابعة طلابك والوصول إلى أدواتك التعليمية.",
  },
  teacher_dash_islamic_logo_alt: {
    en: "Islamic Education Department",
    ar: "قسم التربية الإسلامية",
  },
  teacher_dash_scope_stage: { en: "Educational stage", ar: "المرحلة الدراسية" },
  teacher_dash_scope_more: { en: "+{count} more", ar: "+{count} أخرى" },
  teacher_dash_kpi_avg_performance: { en: "Average Performance", ar: "متوسط أداء الطلاب" },
  teacher_dash_kpi_quiz_activity_hint: {
    en: "Completed quiz activity in your scope",
    ar: "نشاط الاختبارات المكتملة ضمن نطاقك",
  },
  teacher_dash_kpi_load_error: {
    en: "Overview statistics are temporarily unavailable. Your tools and class list remain accessible.",
    ar: "إحصائيات النظرة العامة غير متاحة مؤقتًا. أدواتك وقائمة صفوفك ما زالت متاحة.",
  },
  teacher_dash_section_needs_attention: { en: "Needs Attention", ar: "يتطلب متابعة" },
  teacher_dash_section_announcements: { en: "Announcements", ar: "الإعلانات" },
  teacher_dash_section_analytics: { en: "Teaching Analytics", ar: "تحليلات التدريس" },
  teacher_dash_section_recent_activity: { en: "Recent Activity", ar: "النشاط الأخير" },
  teacher_dash_section_student_overview: { en: "Student Overview", ar: "نظرة على الطلاب" },
  teacher_dash_placeholder_soon: { en: "Coming in the next update", ar: "قريبًا في التحديث القادم" },
  teacher_dash_placeholder_needs_attention_desc: {
    en: "Assignments, quizzes, and planning alerts will appear here.",
    ar: "ستظهر هنا تنبيهات الواجبات والاختبارات والتخطيط الأسبوعي.",
  },
  teacher_dash_placeholder_announcements_desc: {
    en: "School and department announcements for your scope will appear here.",
    ar: "ستظهر هنا إعلانات المدرسة والقسم ضمن نطاقك.",
  },
  teacher_dash_placeholder_analytics_desc: {
    en: "Scoped performance charts and insights will appear here.",
    ar: "ستظهر هنا مخططات الأداء والرؤى ضمن نطاق تدريسك.",
  },
  teacher_dash_placeholder_activity_desc: {
    en: "Recent submissions, lessons, and planning updates will appear here.",
    ar: "ستظهر هنا أحدث الإرسالات والدروس وتحديثات التخطيط.",
  },
  teacher_dash_placeholder_student_overview_desc: {
    en: "High performers and students needing support will appear here.",
    ar: "ستظهر هنا الطلاب المتفوقون والطلاب الذين يحتاجون دعمًا.",
  },
  teacher_dash_action_add_assignment: { en: "Add Assignment", ar: "إضافة واجب" },
  teacher_dash_action_create_quiz: { en: "Create Quiz", ar: "إنشاء اختبار" },
  teacher_dash_action_manage_lessons: { en: "Manage Lessons", ar: "إدارة الدروس" },
  teacher_dash_action_create_announcement: { en: "Create Announcement", ar: "إضافة إعلان" },
  teacher_dash_action_weekly_planning: { en: "Weekly Planning", ar: "التخطيط الأسبوعي" },
  teacher_dash_action_resources: { en: "Resources", ar: "الموارد" },
  teacher_dash_schedule_title: { en: "My Schedule", ar: "جدولي" },
  teacher_dash_schedule_empty: {
    en: "Your school timetable will appear here soon.",
    ar: "سيتم ربط جدولك المدرسي هنا قريباً.",
  },
  teacher_dash_scope_notice: {
    en: "You only see students and data within your assigned teaching scope.",
    ar: "ترى فقط الطلاب والبيانات ضمن نطاق تدريسك المكلّف.",
  },
  teacher_dash_view_performance: { en: "View Performance", ar: "عرض الأداء" },
  teacher_dash_student_count: { en: "{count} students", ar: "{count} طالب" },
  teacher_dash_widget_load_error: {
    en: "This section is temporarily unavailable.",
    ar: "هذا القسم غير متاح مؤقتًا.",
  },
  teacher_dash_analytics_cta: {
    en: "View Detailed Analytics",
    ar: "عرض التحليل التفصيلي",
  },
  teacher_overview_total_students: { en: "Total Students", ar: "إجمالي الطلاب" },
  teacher_overview_with_scores: {
    en: "Students with quiz scores",
    ar: "طلاب لديهم درجات اختبار",
  },
  teacher_overview_need_followup: {
    en: "Need Follow-up",
    ar: "يحتاجون متابعة",
  },
  teacher_overview_top_students: { en: "Top Performers", ar: "أفضل الطلاب" },
  teacher_overview_view_performance: {
    en: "View Student Performance",
    ar: "عرض أداء الطلاب",
  },
  teacher_perf_page_title: {
    en: "My Students Performance Analytics",
    ar: "تحليل أداء طلابي",
  },
  teacher_perf_page_lead: {
    en: "Analyze student, grade and section performance within your assigned teaching scope.",
    ar: "تحليل أداء الطلاب والصفوف والشعب ضمن نطاق تدريسك المكلّف.",
  },
  teacher_perf_filters: { en: "Filters", ar: "الفلاتر" },
  teacher_perf_by_grade: { en: "Performance by Grade", ar: "الأداء حسب الصف" },
  teacher_perf_by_section: { en: "Performance by Section", ar: "الأداء حسب الشعبة" },
  teacher_perf_by_islamic_group: {
    en: "Performance by Islamic Group",
    ar: "الأداء حسب المجموعة الإسلامية",
  },
  teacher_perf_class_comparison: { en: "My Classes Comparison", ar: "مقارنة صفوفي" },
  teacher_perf_no_data: { en: "No data", ar: "لا توجد بيانات" },
  teacher_perf_no_comparison: {
    en: "Not enough scoped data for a comparison chart yet.",
    ar: "لا توجد بيانات كافية ضمن نطاقك لعرض مقارنة بعد.",
  },
  teacher_perf_top_empty: {
    en: "No ranked students in your scope yet.",
    ar: "لا يوجد طلاب مصنّفون ضمن نطاقك بعد.",
  },
  teacher_perf_followup_empty: {
    en: "No students need follow-up right now.",
    ar: "لا يوجد طلاب يحتاجون متابعة حالياً.",
  },
  teacher_perf_grade_empty: {
    en: "No grade data for current filters.",
    ar: "لا توجد بيانات صف للفلاتر الحالية.",
  },
  teacher_perf_section_empty: {
    en: "No section data for current filters.",
    ar: "لا توجد بيانات شعبة للفلاتر الحالية.",
  },
  teacher_perf_loading: { en: "Loading analytics…", ar: "جارٍ تحميل التحليلات…" },
  teacher_perf_load_error: {
    en: "Performance analytics are temporarily unavailable. Please try again.",
    ar: "تحليلات الأداء غير متاحة مؤقتًا. يرجى المحاولة مرة أخرى.",
  },
  teacher_perf_retry: { en: "Try again", ar: "إعادة المحاولة" },
  teacher_attn_all_clear: {
    en: "You're all caught up.",
    ar: "لا توجد مهام عاجلة حالياً",
  },
  teacher_attn_quiz_review_title: { en: "Essay quizzes to review", ar: "اختبارات مقالية للمراجعة" },
  teacher_attn_quiz_review_desc: {
    en: "Quiz submissions waiting for your review.",
    ar: "إرسالات اختبار بانتظار مراجعتك.",
  },
  teacher_attn_assignment_title: { en: "Assignments to grade", ar: "واجبات تحتاج تقييمًا" },
  teacher_attn_assignment_desc: {
    en: "Submitted work not yet graded.",
    ar: "أعمال مسلّمة لم تُقيَّم بعد.",
  },
  teacher_attn_weekly_plan_title: { en: "Weekly plans in progress", ar: "خطط أسبوعية غير مكتملة" },
  teacher_attn_weekly_plan_desc: {
    en: "Plans that are not started or still in progress.",
    ar: "خطط لم تبدأ أو ما زالت قيد الإعداد.",
  },
  teacher_attn_at_risk_title: { en: "Students needing follow-up", ar: "طلاب يحتاجون متابعة" },
  teacher_attn_at_risk_desc: {
    en: "Students below the platform at-risk threshold.",
    ar: "طلاب دون عتبة المتابعة المعتمدة في المنصة.",
  },
  teacher_dash_ann_tab_incoming: { en: "Incoming", ar: "الواردة" },
  teacher_dash_ann_tab_mine: { en: "My Announcements", ar: "إعلاناتي" },
  teacher_dash_ann_create: { en: "Create Announcement", ar: "إضافة إعلان" },
  teacher_dash_ann_source_admin: { en: "Administration", ar: "الإدارة" },
  teacher_dash_ann_incoming_empty: {
    en: "No incoming announcements right now.",
    ar: "لا توجد إعلانات واردة حالياً.",
  },
  teacher_dash_ann_mine_empty: {
    en: "You have not created any announcements yet.",
    ar: "لم تنشئ أي إعلانات بعد.",
  },
  teacher_workspace_back_dashboard: {
    en: "Back to dashboard",
    ar: "العودة إلى لوحة التحكم",
  },
  teacher_dash_activity_empty: {
    en: "No recent activity to show.",
    ar: "لا يوجد نشاط حديث لعرضه",
  },
  teacher_sidebar_overview: { en: "Overview", ar: "نظرة عامة" },
  teacher_sidebar_dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  teacher_sidebar_teaching: { en: "Teaching", ar: "التدريس" },
  teacher_sidebar_students: { en: "Students", ar: "الطلاب" },
  teacher_sidebar_communication: { en: "Communication", ar: "التواصل" },
  teacher_sidebar_other: { en: "Other", ar: "أخرى" },
  teacher_dash_open_menu: { en: "Open menu", ar: "فتح القائمة" },
  teacher_dash_topbar_lead: {
    en: "Your teaching workspace",
    ar: "مساحة عملك التعليمية",
  },
  teacher_dash_nav_brand: {
    en: "Teacher Portal",
    ar: "بوابة المعلم",
  },
  teacher_profile_title: { en: "My Profile", ar: "ملفي الشخصي" },
  teacher_profile_role: { en: "Teacher", ar: "معلم" },
  teacher_profile_teaching_info: { en: "Teaching Information", ar: "المعلومات التعليمية" },
  teacher_profile_class_count: {
    en: "{count} assigned classes",
    ar: "{count} صفوف مكلّفة",
  },
  teacher_sidebar_profile: { en: "Profile", ar: "الملف الشخصي" },
  teacher_nav_add_quiz: { en: "Add Quiz", ar: "إضافة اختبار" },
  teacher_nav_add_assignment: { en: "Add Assignment", ar: "إضافة واجب" },
  teacher_nav_add_timetable: { en: "Add Timetable", ar: "إضافة الجدول" },
  teacher_nav_edit_timetable: { en: "Edit Timetable", ar: "تعديل الجدول" },
  teacher_nav_reports: { en: "Reports", ar: "التقارير" },
  teacher_add_quiz_desc: {
    en: "Choose a lesson to add or edit its quiz questions.",
    ar: "اختر درسًا لإضافة أو تعديل أسئلة اختباره.",
  },
  teacher_add_quiz_no_quiz: {
    en: "Lessons without a quiz",
    ar: "دروس بدون اختبار",
  },
  teacher_add_quiz_has_quiz: {
    en: "Lessons with an existing quiz",
    ar: "دروس لها اختبار",
  },
  teacher_timetable_empty: {
    en: "No timetable uploaded yet.",
    ar: "لم يتم رفع الجدول بعد.",
  },
  teacher_dash_schedule_import: {
    en: "Import your timetable to see today's classes here.",
    ar: "استورد جدولك لعرض حصص اليوم هنا.",
  },
  teacher_timetable_import_cta: {
    en: "Import your timetable",
    ar: "استيراد جدولك",
  },
  teacher_timetable_import_title: {
    en: "Import your timetable",
    ar: "استيراد جدولك",
  },
  teacher_timetable_import_hint: {
    en: "For best accuracy, upload the original Excel timetable when available. JPG, PNG, PDF, and PowerPoint are also supported (max 25 MB).",
    ar: "لأفضل دقة، ارفع جدول Excel الأصلي عند توفره. يمكن أيضًا رفع JPG أو PNG أو PDF أو PowerPoint (بحد أقصى 25 ميجابايت).",
  },
  teacher_timetable_read_ai: {
    en: "Read timetable with AI",
    ar: "قراءة الجدول بالذكاء الاصطناعي",
  },
  teacher_timetable_confirm: {
    en: "Confirm & Save Timetable",
    ar: "اعتماد وحفظ الجدول",
  },
  teacher_timetable_edit: {
    en: "Edit timetable",
    ar: "تعديل الجدول",
  },
  teacher_timetable_edit_cell: {
    en: "Edit period",
    ar: "تعديل الحصة",
  },
  teacher_timetable_manual_fill: {
    en: "Fill grid manually",
    ar: "تعبئة الجدول يدويًا",
  },
  teacher_timetable_cancel_edit: {
    en: "Cancel editing",
    ar: "إلغاء التعديل",
  },
  teacher_timetable_saved_success: {
    en: "Timetable saved. Your dashboard now shows today's schedule.",
    ar: "تم حفظ الجدول. تعرض لوحة التحكم جدول اليوم.",
  },
  teacher_timetable_upload_another: {
    en: "Upload another file",
    ar: "رفع ملف آخر",
  },
  teacher_timetable_review_warning: {
    en: "Some timetable entries need review.",
    ar: "بعض إدخالات الجدول تحتاج مراجعة.",
  },
  teacher_timetable_needs_review: {
    en: "Needs review",
    ar: "يحتاج مراجعة",
  },
  teacher_timetable_no_classes_today: {
    en: "No classes scheduled today.",
    ar: "لا توجد حصص مجدولة اليوم.",
  },
  teacher_timetable_col_day: { en: "Day", ar: "اليوم" },
  teacher_timetable_col_period: { en: "Period", ar: "الحصة" },
  teacher_timetable_col_start: { en: "Start", ar: "البداية" },
  teacher_timetable_col_end: { en: "End", ar: "النهاية" },
  teacher_timetable_col_grade: { en: "Grade", ar: "الصف" },
  teacher_timetable_col_section: { en: "Section", ar: "الشعبة" },
  teacher_timetable_col_subject: { en: "Subject", ar: "المادة" },
  teacher_timetable_col_room: { en: "Room", ar: "القاعة" },
  teacher_timetable_col_type: { en: "Type", ar: "النوع" },
  teacher_timetable_col_class_label: { en: "Class", ar: "الصف" },
  teacher_timetable_col_review: { en: "Needs Review", ar: "يحتاج مراجعة" },
  teacher_timetable_slot_class: { en: "Class", ar: "حصة" },
  teacher_timetable_slot_free: { en: "Free", ar: "فارغة" },
  teacher_timetable_slot_break: { en: "Break", ar: "استراحة" },
  teacher_timetable_dash_free: { en: "Free Period", ar: "حصة فارغة" },
  teacher_timetable_dash_break: { en: "Break", ar: "استراحة" },
  teacher_timetable_ai_disabled: {
    en: "AI timetable reading is not enabled on the server.",
    ar: "قراءة الجدول بالذكاء الاصطناعي غير مفعلة على الخادم.",
  },
  teacher_timetable_extract_error: {
    en: "Could not read the timetable. Try another file or edit manually.",
    ar: "تعذرت قراءة الجدول. جرّب ملفًا آخر أو عدّل يدويًا.",
  },
  teacher_timetable_error_unsupported_file: {
    en: "Unsupported file type. Upload JPG, PNG, PDF, Excel (.xlsx), or PowerPoint (.pptx).",
    ar: "نوع ملف غير مدعوم. ارفع JPG أو PNG أو PDF أو Excel (.xlsx) أو PowerPoint (.pptx).",
  },
  teacher_timetable_error_unreadable: {
    en: "Unreadable timetable. Try a clearer file or the original Excel export.",
    ar: "جدول غير قابل للقراءة. جرّب ملفًا أوضح أو تصدير Excel الأصلي.",
  },
  teacher_timetable_error_parsing_failed: {
    en: "File parsing failed. Try re-exporting the timetable or upload Excel (.xlsx).",
    ar: "فشل تحليل الملف. أعد تصدير الجدول أو ارفع Excel (.xlsx).",
  },
  teacher_timetable_error_ai_unavailable: {
    en: "AI temporarily unavailable. Try again shortly or fill the grid manually.",
    ar: "الذكاء الاصطناعي غير متاح مؤقتًا. أعد المحاولة قريبًا أو عبّئ الجدول يدويًا.",
  },
  teacher_timetable_confirm_error: {
    en: "Could not save your confirmed schedule.",
    ar: "تعذر حفظ الجدول المعتمد.",
  },
  teacher_timetable_confirmed_hint: {
    en: "Your schedule is saved. Today's classes appear on your dashboard.",
    ar: "تم حفظ جدولك. تظهر حصص اليوم في لوحة التحكم.",
  },
  teacher_timetable_upload: { en: "Upload timetable", ar: "رفع الجدول" },
  teacher_timetable_replace: { en: "Replace timetable", ar: "استبدال الجدول" },
  teacher_timetable_remove: { en: "Remove timetable", ar: "حذف الجدول" },
  teacher_timetable_open: { en: "Open timetable", ar: "فتح الجدول" },
  teacher_timetable_uploaded: { en: "Uploaded", ar: "تاريخ الرفع" },
  teacher_timetable_invalid_type: {
    en: "Please upload JPG, PNG, PDF, Excel (.xlsx/.xls), or PowerPoint (.pptx).",
    ar: "يرجى رفع JPG أو PNG أو PDF أو Excel (.xlsx/.xls) أو PowerPoint (.pptx).",
  },
  teacher_timetable_too_large: {
    en: "Timetable file must be 25 MB or smaller.",
    ar: "يجب ألا يتجاوز ملف الجدول 25 ميجابايت.",
  },
  teacher_timetable_upload_error: {
    en: "Could not upload timetable. Please try again.",
    ar: "تعذر رفع الجدول. يرجى المحاولة مرة أخرى.",
  },
  teacher_timetable_load_error: {
    en: "Could not load timetable.",
    ar: "تعذر تحميل الجدول.",
  },
  teacher_timetable_remove_error: {
    en: "Could not remove timetable.",
    ar: "تعذر حذف الجدول.",
  },
  teacher_timetable_none_to_edit: {
    en: "No timetable has been uploaded yet.",
    ar: "لم يتم رفع أي جدول بعد.",
  },
  teacher_reports_lead: {
    en: "Evidence-based reports for your assigned teaching scope.",
    ar: "تقارير مبنية على بيانات حقيقية ضمن نطاق تدريسك.",
  },
  teacher_reports_load_error: {
    en: "Reports are temporarily unavailable. Please try again.",
    ar: "التقارير غير متاحة مؤقتًا. يرجى المحاولة مرة أخرى.",
  },
  teacher_reports_retry: { en: "Try again", ar: "إعادة المحاولة" },
  teacher_report_no_data: {
    en: "No measurable data for this selection yet.",
    ar: "لا توجد بيانات قابلة للقياس لهذا الاختيار بعد.",
  },
  teacher_report_no_sections: {
    en: "No sections available in your teaching scope for this grade.",
    ar: "لا توجد شُعب متاحة في نطاق تدريسك لهذا الصف.",
  },
  teacher_report_no_section_students: {
    en: "No student or report data available for this section yet.",
    ar: "لا توجد بيانات طلاب أو تقارير لهذه الشعبة بعد.",
  },
  teacher_report_select_student: {
    en: "Select a student to view their report.",
    ar: "اختر طالبًا لعرض تقريره.",
  },
  teacher_report_class: { en: "Class Report", ar: "تقرير الصف" },
  teacher_report_section: { en: "Section Report", ar: "تقرير الشعبة" },
  teacher_report_student: { en: "Student Report", ar: "تقرير الطالب" },
  teacher_report_strengths: { en: "Measured strengths", ar: "نقاط القوة المقاسة" },
  teacher_report_needs_support: { en: "Areas needing support", ar: "مجالات تحتاج دعمًا" },
  teacher_report_print: { en: "Print report", ar: "طباعة التقرير" },
  teacher_report_metric_avg_score: { en: "Average quiz score", ar: "متوسط درجة الاختبار" },
  teacher_report_metric_quiz_activity: {
    en: "Students with quiz activity",
    ar: "طلاب لديهم نشاط اختبارات",
  },
  teacher_report_strength_top_score: {
    en: "Highest quiz performance",
    ar: "أعلى أداء في الاختبارات",
  },
  teacher_report_strength_lessons_completed: {
    en: "Completed lessons",
    ar: "الدروس المكتملة",
  },
  teacher_report_strength_certificates: {
    en: "Certificates earned",
    ar: "الشهادات المكتسبة",
  },
  teacher_report_support_at_risk_count: {
    en: "Students needing follow-up",
    ar: "طلاب يحتاجون متابعة",
  },
  teacher_report_support_below_threshold: {
    en: "Below follow-up threshold",
    ar: "أقل من حد المتابعة",
  },
  teacher_report_support_no_quiz_data: {
    en: "Without measured quiz data",
    ar: "بدون بيانات اختبار مقاسة",
  },
  teacher_report_support_low_progress: {
    en: "Low lesson progress",
    ar: "تقدم منخفض في الدروس",
  },
  teacher_overview_without_scores: {
    en: "Without quiz activity",
    ar: "بدون نشاط اختبارات",
  },
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
  wp_dept_title: { en: "Weekly Planning Dashboard", ar: "لوحة متابعة الخطط الأسبوعية" },
  wp_dept_lead: {
    en: "Islamic Education department overview — all teachers, weeks 1–30.",
    ar: "نظرة عامة على قسم التربية الإسلامية — جميع المعلمين، الأسابيع 1–30.",
  },
  wp_dept_dashboard_nav: { en: "Weekly Planning Dashboard", ar: "لوحة متابعة الخطط" },
  wp_dept_nav_section: { en: "Department oversight", ar: "متابعة القسم" },
  lead_teacher_nav_section: { en: "Lead Teacher", ar: "معلم القسم" },
  lead_teacher_nav_overview: { en: "Management Overview", ar: "نظرة إدارية" },
  lead_teacher_nav_students: { en: "Students", ar: "الطلاب" },
  lead_teacher_nav_teachers: { en: "Teachers", ar: "المعلمون" },
  lead_teacher_nav_parents: { en: "Parents", ar: "أولياء الأمور" },
  lead_teacher_nav_analytics: { en: "Analytics", ar: "التحليلات" },
  lead_teacher_nav_content: { en: "Content Center", ar: "مركز المحتوى" },
  lead_teacher_nav_honor_board: { en: "Honor Board", ar: "لوحة الشرف" },
  lead_teacher_nav_grades: { en: "Grades & Classes", ar: "الصفوف والفصول" },
  lead_teacher_overview_title: { en: "School Management Overview", ar: "نظرة عامة على إدارة المدرسة" },
  lead_teacher_overview_lead: {
    en: "Operational tools for department administration — students, staff, parents, analytics, and content.",
    ar: "أدوات تشغيلية لإدارة القسم — الطلاب والمعلمين وأولياء الأمور والتحليلات والمحتوى.",
  },
  lead_teacher_back_overview: { en: "Back to management overview", ar: "العودة إلى النظرة الإدارية" },
  lead_teacher_access_denied: {
    en: "You do not have lead teacher access to this area.",
    ar: "ليس لديك صلاحية معلم القسم للوصول إلى هذه المنطقة.",
  },
  wp_dept_total_teachers: { en: "Total teachers", ar: "إجمالي المعلمين" },
  wp_dept_total_plans: { en: "Submitted plans", ar: "الخطط المقدمة" },
  wp_dept_overall_completion: { en: "Overall completion", ar: "نسبة الإكمال الإجمالية" },
  wp_dept_category_avg: { en: "Category averages (submitted plans)", ar: "متوسط الفئات (الخطط المقدمة)" },
  wp_dept_teacher_summary: { en: "Teacher summary", ar: "ملخص المعلمين" },
  wp_dept_assigned_grades: { en: "Assigned grades", ar: "الصفوف المكلف بها" },
  wp_dept_expected: { en: "Expected slots", ar: "الفترات المتوقعة" },
  wp_dept_created: { en: "Submitted", ar: "مقدمة" },
  wp_dept_week_grid: { en: "Weeks 1–30 overview", ar: "نظرة عامة للأسابيع 1–30" },
  wp_dept_filters: { en: "Filters", ar: "الفلاتر" },
  wp_dept_filter_all_teachers: { en: "All teachers", ar: "جميع المعلمين" },
  wp_dept_filter_all_groups: { en: "All Islamic groups", ar: "جميع المجموعات" },
  wp_dept_filter_all_domains: { en: "All domains", ar: "جميع المجالات" },
  wp_dept_filter_all_units: { en: "All units", ar: "جميع الوحدات" },
  wp_dept_clear_filters: { en: "Clear filters", ar: "مسح الفلاتر" },
  wp_dept_tracker: { en: "Week 1–30 tracker", ar: "متابعة الأسابيع 1–30" },
  wp_dept_tracker_hint: {
    en: "Each row is one expected planning slot (teacher × week × grade scope). Missing submissions show Not Started.",
    ar: "كل صف يمثل فترة تخطيط متوقعة (معلم × أسبوع × نطاق صف). الغياب يظهر كـ لم يبدأ.",
  },
  wp_dept_no_results: { en: "No rows match the current filters.", ar: "لا توجد نتائج للفلاتر الحالية." },
  wp_dept_next_action: { en: "Next action", ar: "الإجراء التالي" },
  wp_dept_view_plan: { en: "View plan", ar: "عرض الخطة" },
  wp_dept_view_plan_n: { en: "View plan {n}", ar: "عرض الخطة {n}" },
  wp_dept_section_coverage: { en: "Section coverage", ar: "تغطية الشعب" },
  wp_dept_sections_expected: { en: "Expected", ar: "المتوقع" },
  wp_dept_sections_covered: { en: "Covered", ar: "المغطى" },
  wp_dept_sections_missing: { en: "Missing", ar: "الناقص" },
  wp_dept_next_action_missing_sections: {
    en: "Submit plans for missing sections",
    ar: "قدّم خطط للشعب الناقصة",
  },
  wp_dept_back_dashboard: { en: "Back to dashboard", ar: "العودة إلى اللوحة" },
  wp_dept_access_denied: {
    en: "You do not have access to the department Weekly Planning dashboard.",
    ar: "ليس لديك صلاحية للوصول إلى لوحة متابعة الخطط الأسبوعية للقسم.",
  },
  wp_dept_empty_teachers: {
    en: "No Islamic Education teachers with class assignments were found.",
    ar: "لم يتم العثور على معلمين للتربية الإسلامية مع تكليفات صفوف.",
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
  teacher_publish_to_students: { en: "Publish to Students", ar: "نشر للطلاب" },
  teacher_unpublish: { en: "Unpublish", ar: "إلغاء النشر" },
  teacher_publish_lesson_confirm: {
    en: "Do you want to publish this lesson to students?",
    ar: "هل تريد نشر هذا الدرس للطلاب؟",
  },
  teacher_lesson_published_success: {
    en: "Lesson published to students successfully.",
    ar: "تم نشر الدرس للطلاب بنجاح",
  },
  teacher_lesson_unpublished_success: {
    en: "Lesson unpublished. Students can no longer see it.",
    ar: "تم إلغاء نشر الدرس. لم يعد الطلاب يرون الدرس.",
  },
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
  auth_forgot_password: { en: "Forgot password?", ar: "نسيت كلمة المرور؟" },
  auth_forgot_password_lead: {
    en: "Enter your account email and we will send a secure link to reset your password.",
    ar: "أدخل بريد حسابك وسنرسل رابطًا آمنًا لإعادة تعيين كلمة المرور.",
  },
  auth_send_reset_link: { en: "Send reset link", ar: "إرسال رابط التعيين" },
  auth_reset_email_sent: {
    en: "If an account exists for that email, a password reset link has been sent.",
    ar: "إذا كان هناك حساب لهذا البريد، فقد أُرسل رابط إعادة تعيين كلمة المرور.",
  },
  auth_forgot_email_required: {
    en: "Enter your email address first.",
    ar: "أدخل بريدك الإلكتروني أولاً.",
  },
  reset_password_title: { en: "Reset Password", ar: "إعادة تعيين كلمة المرور" },
  reset_password_lead: {
    en: "Choose a new password for your Ignite Academy account.",
    ar: "اختر كلمة مرور جديدة لحسابك في أكاديمية اجنايت.",
  },
  reset_password_new: { en: "New Password", ar: "كلمة المرور الجديدة" },
  reset_password_confirm: { en: "Confirm New Password", ar: "تأكيد كلمة المرور الجديدة" },
  reset_password_save: { en: "Save New Password", ar: "حفظ كلمة المرور الجديدة" },
  reset_password_success: {
    en: "Password updated successfully.",
    ar: "تم تحديث كلمة المرور بنجاح.",
  },
  reset_password_success_hint: {
    en: "Sign in with your new password from any browser or device.",
    ar: "سجّل الدخول بكلمة المرور الجديدة من أي متصفح أو جهاز.",
  },
  reset_password_invalid: {
    en: "This password reset link is invalid or has expired. Request a new link from the login page.",
    ar: "رابط إعادة تعيين كلمة المرور غير صالح أو منتهي. اطلب رابطًا جديدًا من صفحة تسجيل الدخول.",
  },
  reset_password_back_login: { en: "Back to login", ar: "العودة لتسجيل الدخول" },
  reset_password_admin_login: { en: "Admin login", ar: "دخول المشرف" },
  reset_password_min_length: {
    en: "Password must be at least 8 characters.",
    ar: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
  },
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
  auth_err_invalid_email: {
    en: "Please enter a valid email address.",
    ar: "يرجى إدخال بريد إلكتروني صالح.",
  },
  auth_err_network: {
    en: "Network error. Please check your connection and try again.",
    ar: "خطأ في الشبكة. يرجى التحقق من الاتصال والمحاولة مرة أخرى.",
  },
  auth_err_signup_failed: {
    en: "Registration failed. Please try again.",
    ar: "تعذّر إنشاء الحساب. يرجى المحاولة مرة أخرى.",
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
  parent_dashboard_load_error: {
    en: "We couldn't load your child's dashboard right now. Please try again.",
    ar: "تعذّر تحميل لوحة تقدّم طفلك الآن. يرجى المحاولة مرة أخرى.",
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
  parent_assignments_empty: {
    en: "No assignments to show yet.",
    ar: "لا توجد واجبات لعرضها بعد.",
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
  parent_kpi_attention: {
    en: "Assignments Needing Attention",
    ar: "واجبات تحتاج انتباهك",
  },
  parent_kpi_no_quiz_yet: { en: "No quiz results yet", ar: "لا نتائج اختبارات بعد" },
  parent_kpi_no_lessons_yet: { en: "No lessons completed yet", ar: "لم يُكمل أي درس بعد" },
  parent_kpi_no_lessons_completed: { en: "No lessons completed yet", ar: "لم يُكمل أي درس بعد" },
  parent_kpi_lessons_count: {
    en: "{n} lessons completed",
    ar: "أكمل {n} درسًا",
  },
  parent_kpi_lessons_available: {
    en: "{n} lessons available in grade",
    ar: "{n} دروس متاحة في الصف",
  },
  parent_kpi_nothing_attention: { en: "Nothing needs attention", ar: "لا شيء يحتاج انتباهك" },
  parent_kpi_no_certs_yet: { en: "No certificates yet", ar: "لا شهادات بعد" },
  parent_needs_attention_title: { en: "Needs Your Attention", ar: "يحتاج انتباهك" },
  parent_needs_attention_lead: {
    en: "Assignments and academic follow-ups for your child.",
    ar: "الواجبات والمتابعة الأكاديمية لابنك/ابنتك.",
  },
  parent_everything_good: { en: "Everything looks good", ar: "كل شيء يبدو جيدًا" },
  parent_rank_section: { en: "Section Rank", ar: "الترتيب في الشعبة" },
  parent_rankings_title: { en: "Peer rankings", ar: "الترتيب بين الأقران" },
  parent_rankings_not_enough: {
    en: "Not enough data yet",
    ar: "لا توجد بيانات كافية بعد",
  },
  parent_achievements_section_title: {
    en: "Achievements & Certificates",
    ar: "الإنجازات والشهادات",
  },
  parent_achievements_section_lead: {
    en: "Certificates earned and badge milestones.",
    ar: "الشهادات المكتسبة وإنجازات الشارات.",
  },
  parent_badges_empty: {
    en: "Badges unlock as your child progresses.",
    ar: "تُفتح الشارات مع تقدّم ابنك/ابنتك.",
  },
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

  // Error & not-found pages
  err_page_title: { en: "This page didn't load", ar: "تعذّر تحميل هذه الصفحة" },
  err_page_body: {
    en: "Something went wrong on our end. You can try refreshing or head back home.",
    ar: "حدث خطأ من جانبنا. يمكنك تحديث الصفحة أو العودة إلى الرئيسية.",
  },
  try_again: { en: "Try again", ar: "حاول مرة أخرى" },
  go_home: { en: "Go home", ar: "العودة للرئيسية" },
  page_not_found: { en: "Page not found", ar: "الصفحة غير موجودة" },
  page_not_found_body: {
    en: "The page you're looking for doesn't exist or has been moved.",
    ar: "الصفحة التي تبحث عنها غير موجودة أو نُقلت.",
  },
  grade_not_found: { en: "Grade not found.", ar: "الصف غير موجود." },
  unit_not_found: { en: "Unit not found.", ar: "الوحدة غير موجودة." },
  lesson_not_found: { en: "Lesson not found.", ar: "الدرس غير موجود." },
  quiz_not_found: { en: "Quiz not found.", ar: "الاختبار غير موجود." },
  quiz_not_available: { en: "This quiz is not available.", ar: "هذا الاختبار غير متاح." },
  back_to_quizzes: { en: "Back to quizzes", ar: "العودة إلى الاختبارات" },
  video_not_found: { en: "Video not found.", ar: "الفيديو غير موجود." },
  category_not_found: { en: "Category not found.", ar: "التصنيف غير موجود." },
  admin_no_lessons_found: { en: "No lessons found.", ar: "لا توجد دروس." },
  session_retry_hint: {
    en: "Sign out and sign in again, or contact support if this persists.",
    ar: "سجّل الخروج ثم الدخول مجددًا، أو تواصل مع الدعم إذا استمرت المشكلة.",
  },
  parent_role_error: {
    en: "Could not confirm parent role from public.user_roles.",
    ar: "تعذّر تأكيد دور ولي الأمر من public.user_roles.",
  },
  student_role_error: {
    en: "Could not confirm student role from public.user_roles.",
    ar: "تعذّر تأكيد دور الطالب من public.user_roles.",
  },
  account_role_error: {
    en: "Could not resolve account role from public.user_roles.",
    ar: "تعذّر تحديد دور الحساب من public.user_roles.",
  },

  // Aria & generic UI chrome
  aria_breadcrumb: { en: "Breadcrumb", ar: "مسار التنقل" },
  aria_toggle_menu: { en: "Toggle menu", ar: "فتح/إغلاق القائمة" },
  aria_toggle_admin_menu: { en: "Toggle admin menu", ar: "فتح/إغلاق قائمة الإدارة" },
  aria_toggle_sidebar: { en: "Toggle Sidebar", ar: "فتح/إغلاق الشريط الجانبي" },
  aria_sidebar: { en: "Sidebar", ar: "الشريط الجانبي" },
  aria_sidebar_mobile_desc: { en: "Displays the mobile sidebar.", ar: "يعرض الشريط الجانبي على الجوال." },
  aria_pagination: { en: "pagination", ar: "ترقيم الصفحات" },
  aria_go_prev_page: { en: "Go to previous page", ar: "الانتقال إلى الصفحة السابقة" },
  aria_go_next_page: { en: "Go to next page", ar: "الانتقال إلى الصفحة التالية" },
  ui_previous: { en: "Previous", ar: "السابق" },
  ui_next: { en: "Next", ar: "التالي" },
  ui_more_pages: { en: "More pages", ar: "صفحات إضافية" },
  carousel_prev_slide: { en: "Previous slide", ar: "الشريحة السابقة" },
  carousel_next_slide: { en: "Next slide", ar: "الشريحة التالية" },

  // Contact page labels
  contact_email_label: { en: "Email", ar: "البريد الإلكتروني" },
  contact_phone_label: { en: "Phone", ar: "الهاتف" },
  contact_location_label: { en: "Location", ar: "الموقع" },

  // Admin debug
  admin_cms_debug: { en: "CMS Debug", ar: "تصحيح CMS" },
  admin_refetch: { en: "Refetch", ar: "إعادة الجلب" },
  file_type_powerpoint: { en: "PowerPoint", ar: "PowerPoint" },
  file_type_word_doc: { en: "Word Document", ar: "مستند Word" },

  // Certificate template (fixed bilingual layout)
  cert_title_en: { en: "Certificate of Achievement", ar: "شهادة إنجاز" },
  cert_award_org_en: {
    en: "Ignite School – Department of Islamic Education",
    ar: "مدرسة اجنايت – قسم التربية الإسلامية",
  },
  cert_lesson_details_en: { en: "LESSON DETAILS", ar: "بيانات الدرس" },
  cert_dept_alt: { en: "Department of Islamic Education", ar: "قسم التربية الإسلامية" },
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

const LOCALE_BY_EN: Partial<Record<Lang, Record<string, string>>> = {
  fr: frByEn,
  de: deByEn,
  ur: urByEn,
  zh: zhByEn,
};

function translate(key: TKey, lang: Lang): string {
  const entry = t[key];
  const keyOverride = LOCALE_OVERRIDES[lang]?.[key];
  if (keyOverride) return keyOverride;
  if (lang === "ar") return entry.ar;
  if (lang === "en") return entry.en;
  const byEn = LOCALE_BY_EN[lang]?.[entry.en];
  if (byEn) return byEn;
  return entry.en || entry.ar;
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
      assertSafeReactLocalizedChild(text, meta?.fieldName);

      const contentType = meta?.contentType ?? "general";
      const strictLesson = isStrictLessonContentType(contentType);
      const stored = resolveStoredBiText(text, lang, { contentType });

      if (stored) return stored;

      if (strictLesson) {
        return resolveLocalizedContent(text, lang, "strict").value;
      }

      const source = biSourceForTranslation(text, lang, { contentType });
      if (source) {
        const lessonId = meta?.lessonId ?? lessonScopeRef.current ?? undefined;
        const fieldName = meta?.fieldName ?? "content";

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

        return "";
      }

      return resolveLocalizedContent(text, lang, "display").value;
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
