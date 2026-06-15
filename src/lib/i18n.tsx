import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Bi } from "@/lib/curriculum";
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
  type EducationalContentType,
} from "@/lib/translate-content";

export type { Lang, ContentLocale } from "@/lib/i18n-config";
export { L, LANG_OPTIONS, pickBi, pickBiLocale } from "@/lib/i18n-config";
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
  stat_worksheets: { en: "Worksheets", ar: "أوراق العمل" },
  stat_students: { en: "Students", ar: "الطلاب" },
  stat_assessments: { en: "Assessments", ar: "التقييمات" },
  stat_videos: { en: "Videos", ar: "الفيديوهات" },
  questions: { en: "Questions", ar: "أسئلة" },

  badge_certified: { en: "Certified Curriculum", ar: "منهج معتمد" },
  badge_certified_sub: { en: "Aligned with international standards", ar: "متوافق مع المعايير الدولية" },

  // Stages section
  stages_eyebrow: { en: "Academic Stages", ar: "المراحل الدراسية" },
  stages_title: { en: "Find your learning path", ar: "اختر مسار تعلّمك" },
  stages_desc: { en: "From first letters to final exams — a structured journey through every grade.", ar: "من الحروف الأولى إلى الاختبارات النهائية — رحلة منظَّمة عبر كل صف." },
  stage_kg: { en: "Kindergarten", ar: "رياض الأطفال" },
  stage_kg_grades: { en: "KG1 – KG2", ar: "روضة 1 – روضة 2" },
  stage_elem: { en: "Elementary", ar: "المرحلة الابتدائية" },
  stage_elem_grades: { en: "Grade 1 – 5", ar: "الصف 1 – 5" },
  stage_mid: { en: "Middle School", ar: "المرحلة المتوسطة" },
  stage_mid_grades: { en: "Grade 6 – 8", ar: "الصف 6 – 8" },
  stage_high: { en: "High School", ar: "المرحلة الثانوية" },
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

  // Announcements
  ann_eyebrow: { en: "Announcements", ar: "الإعلانات" },
  ann_title: { en: "What's new", ar: "آخر المستجدات" },
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
  ls_activity: { en: "Student Activity", ar: "نشاط الطالب" },
  ls_worksheet: { en: "Worksheet", ar: "ورقة العمل" },
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
  vocab: { en: "Key Vocabulary", ar: "المفردات الأساسية" },
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
  auth_grade: { en: "Grade", ar: "الصف الدراسي" },
  auth_section: { en: "Section", ar: "الشعبة" },
  auth_islamic_group: { en: "Islamic Group", ar: "المجموعة الإسلامية" },
  auth_profile_photo: { en: "Profile photo", ar: "صورة الملف الشخصي" },
  auth_submit_signup: { en: "Create account", ar: "إنشاء الحساب" },
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
    en: "Your account was created. Please check your email to confirm, then sign in.",
    ar: "تم إنشاء حسابك. يرجى التحقق من بريدك الإلكتروني ثم تسجيل الدخول.",
  },
  auth_success_parent: {
    en: "Your account was created. Please check your email to confirm, then sign in.",
    ar: "تم إنشاء حسابك. يرجى التحقق من بريدك الإلكتروني ثم تسجيل الدخول.",
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
  hof_avg_score_label: { en: "Avg. score", ar: "متوسط الدرجات" },
  hof_certificates_label: { en: "Certificates", ar: "الشهادات" },
  grade_champion_suffix: { en: "Champion", ar: "بطل" },
  not_set: { en: "Not set", ar: "غير محدد" },
  auth_err_email_password: {
    en: "Please enter your email and password.",
    ar: "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
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
  const [lang, setLangState] = useState<Lang>("ar");
  const [contentRev, setContentRev] = useState(0);
  const [contentTranslating, setContentTranslating] = useState(0);
  const [translationUnavailable, setTranslationUnavailable] = useState(false);
  const lessonScopeRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(saved)) setLangState(saved);
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

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(LANG_STORAGE_KEY, l);
  };

  const setLessonScope = useCallback((lessonId: string | null) => {
    lessonScopeRef.current = lessonId;
  }, []);

  const locale = contentLocale(lang);

  /** Read-only: returns cache or English/Arabic fallback. Translation runs in useEffect via prefetch only. */
  const bi = useCallback(
    (text?: Bi | null, meta?: BiFieldMeta) => {
      if (!text) return "";
      if (!needsDynamicTranslation(lang)) {
        return pickBiLocale(text, locale);
      }
      const source = text.en?.trim() || text.ar?.trim() || "";
      if (!source) return "";

      const lessonId = meta?.lessonId ?? lessonScopeRef.current ?? undefined;
      const fieldName = meta?.fieldName ?? "content";
      const contentType = meta?.contentType ?? "general";

      const cached = getCachedEducationalTranslation({
        lang,
        contentType,
        lessonId,
        fieldName,
        source,
      });
      if (cached) return cached;

      return educationalDisplayFallback(source, lang, text);
    },
    [lang, locale, contentRev],
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
