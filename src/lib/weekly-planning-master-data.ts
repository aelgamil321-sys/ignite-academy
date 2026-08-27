/**
 * Official Weekly Planning master list values from reference/weekly-plan-template.xlsx (LISTS sheet).
 * Preserve workbook strings exactly in workbookValue where bilingual pairs are stored.
 */

export type MasterListSeedItem = {
  labelAr: string;
  labelEn: string;
  workbookValue: string;
  metadata?: Record<string, unknown>;
};

export const WEEKLY_PLAN_ACADEMIC_YEAR = "2026-2027";

export const WEEKLY_PLAN_DEFAULT_SUBJECT = "التربية الإسلامية / Islamic Education";

export const WEEKLY_PLAN_GROUP_PROMPT_TEMPLATE =
  "المجموعة 1 / Group 1:\r\nالمجموعة 2 / Group 2:\r\nالمجموعة 3 / Group 3:\r\nالمجموعة 4 – إثراء / Group 4 – Extension:";

export const WEEKLY_PLAN_DIFFERENTIATION_PROMPT_TEMPLATE = "1.\r\n\r\n2.\r\n\r\n3.";

export const WEEKLY_PLAN_REFLECTION_PROMPT_TEMPLATE =
  "ما الذي نجح؟ ما الذي يحتاج إلى تعديل؟ وأي الطلاب يحتاجون إلى متابعة في الأسبوع المقبل.\r\nWhat worked, what to adjust, which students need follow-up next week.";

/** Workbook footer — WEEK sheet rows 28–29 (exact audit capture). */
export const WEEKLY_PLAN_MISSION = {
  ar: "تتمثل رسالتنا في معرفة احتياجات كل طالب، والعمل بصورة تعاونية لبناء بيئة تعلّم مستدامة ومتمحورة حول الطالب في القرن الحادي والعشرين، تعزّز القيادة والتماسك الاجتماعي والإبداع والمسؤولية والطموح، وتتيح للقدرات ذات القيمة المستدامة أن تنمو وتبرز.",
  en: "Our mission is to know the needs of every student, collaboratively creating a student-centered, sustainable 21st century learning environment that fosters leadership, social cohesion, creativity, responsibility and ambition providing a catalyst for abilities of lasting relevance to emerge.",
} as const;

export const WEEKLY_PLAN_VISION = {
  ar: "رؤيتنا أن يدرك جميع الشباب أن للتعلّم قيمة مستدامة تمتد إلى ما بعد حياتهم المدرسية.",
  en: "Our vision is for all young people to experience that learning has lasting value beyond their life at school.",
} as const;

export const WEEKLY_PLAN_DOMAINS: MasterListSeedItem[] = [
  {
    labelAr: "الوحي الإلهي - القرآن الكريم",
    labelEn: "Divine Revelation - Holy Qur'an",
    workbookValue: "الوحي الإلهي - القرآن الكريم / Divine Revelation - Holy Qur'an",
  },
  {
    labelAr: "الوحي الإلهي - الحديث الشريف",
    labelEn: "Divine Revelation - Prophetic Hadith",
    workbookValue: "الوحي الإلهي - الحديث الشريف / Divine Revelation - Prophetic Hadith",
  },
  {
    labelAr: "العقيدة الإسلامية",
    labelEn: "Islamic Creed",
    workbookValue: "العقيدة الإسلامية / Islamic Creed",
  },
  {
    labelAr: "قيم الإسلام وآدابه",
    labelEn: "Islamic Values and Manners",
    workbookValue: "قيم الإسلام وآدابه / Islamic Values and Manners",
  },
  {
    labelAr: "أحكام الإسلام ومقاصده",
    labelEn: "Islamic Rulings and Objectives",
    workbookValue: "أحكام الإسلام ومقاصده / Islamic Rulings and Objectives",
  },
  {
    labelAr: "السيرة والشخصيات",
    labelEn: "Prophetic Biography and Personalities",
    workbookValue: "السيرة والشخصيات / Prophetic Biography and Personalities",
  },
  {
    labelAr: "الهوية والقضايا المعاصرة",
    labelEn: "Identity and Contemporary Issues",
    workbookValue: "الهوية والقضايا المعاصرة / Identity and Contemporary Issues",
  },
];

export const WEEKLY_PLAN_PHASES: MasterListSeedItem[] = [
  {
    labelAr: "رياض الأطفال",
    labelEn: "KG",
    workbookValue: "رياض الأطفال / KG",
    metadata: { phase_slug: "kindergarten" },
  },
  {
    labelAr: "المرحلة الابتدائية",
    labelEn: "Elementary",
    workbookValue: "المرحلة الابتدائية / Elementary",
    metadata: { phase_slug: "elementary" },
  },
  {
    labelAr: "المرحلة المتوسطة",
    labelEn: "Middle",
    workbookValue: "المرحلة المتوسطة / Middle",
    metadata: { phase_slug: "middle" },
  },
  {
    labelAr: "المرحلة الثانوية",
    labelEn: "High",
    workbookValue: "المرحلة الثانوية / High",
    metadata: { phase_slug: "high" },
  },
];

export const WEEKLY_PLAN_GRADES: MasterListSeedItem[] = [
  {
    labelAr: "الروضة الأولى",
    labelEn: "KG1",
    workbookValue: "الروضة الأولى / KG1",
    metadata: { grade_slug: "kg1", phase_slug: "kindergarten" },
  },
  {
    labelAr: "الروضة الثانية",
    labelEn: "KG2",
    workbookValue: "الروضة الثانية / KG2",
    metadata: { grade_slug: "kg2", phase_slug: "kindergarten" },
  },
  {
    labelAr: "الصف الأول",
    labelEn: "Grade 1",
    workbookValue: "الصف الأول / Grade 1",
    metadata: { grade_slug: "1", phase_slug: "elementary" },
  },
  {
    labelAr: "الصف الثاني",
    labelEn: "Grade 2",
    workbookValue: "الصف الثاني / Grade 2",
    metadata: { grade_slug: "2", phase_slug: "elementary" },
  },
  {
    labelAr: "الصف الثالث",
    labelEn: "Grade 3",
    workbookValue: "الصف الثالث / Grade 3",
    metadata: { grade_slug: "3", phase_slug: "elementary" },
  },
  {
    labelAr: "الصف الرابع",
    labelEn: "Grade 4",
    workbookValue: "الصف الرابع / Grade 4",
    metadata: { grade_slug: "4", phase_slug: "elementary" },
  },
  {
    labelAr: "الصف الخامس",
    labelEn: "Grade 5",
    workbookValue: "الصف الخامس / Grade 5",
    metadata: { grade_slug: "5", phase_slug: "elementary" },
  },
  {
    labelAr: "الصف السادس",
    labelEn: "Grade 6",
    workbookValue: "الصف السادس / Grade 6",
    metadata: { grade_slug: "6", phase_slug: "middle" },
  },
  {
    labelAr: "الصف السابع",
    labelEn: "Grade 7",
    workbookValue: "الصف السابع / Grade 7",
    metadata: { grade_slug: "7", phase_slug: "middle" },
  },
  {
    labelAr: "الصف الثامن",
    labelEn: "Grade 8",
    workbookValue: "الصف الثامن / Grade 8",
    metadata: { grade_slug: "8", phase_slug: "middle" },
  },
  {
    labelAr: "الصف التاسع",
    labelEn: "Grade 9",
    workbookValue: "الصف التاسع / Grade 9",
    metadata: { grade_slug: "9", phase_slug: "high" },
  },
  {
    labelAr: "الصف العاشر",
    labelEn: "Grade 10",
    workbookValue: "الصف العاشر / Grade 10",
    metadata: { grade_slug: "10", phase_slug: "high" },
  },
  {
    labelAr: "الصف الحادي عشر",
    labelEn: "Grade 11",
    workbookValue: "الصف الحادي عشر / Grade 11",
    metadata: { grade_slug: "11", phase_slug: "high" },
  },
  {
    labelAr: "الصف الثاني عشر",
    labelEn: "Grade 12",
    workbookValue: "الصف الثاني عشر / Grade 12",
    metadata: { grade_slug: "12", phase_slug: "high" },
  },
];

export const WEEKLY_PLAN_SECTIONS: MasterListSeedItem[] = [
  { labelAr: "A", labelEn: "A", workbookValue: "A" },
  { labelAr: "B", labelEn: "B", workbookValue: "B" },
  { labelAr: "C", labelEn: "C", workbookValue: "C" },
  { labelAr: "D", labelEn: "D", workbookValue: "D" },
  { labelAr: "E", labelEn: "E", workbookValue: "E" },
  { labelAr: "F", labelEn: "F", workbookValue: "F" },
  { labelAr: "G", labelEn: "G", workbookValue: "G" },
  { labelAr: "H", labelEn: "H", workbookValue: "H" },
];

export const WEEKLY_PLAN_DAYS: MasterListSeedItem[] = [
  {
    labelAr: "الاثنين",
    labelEn: "Monday",
    workbookValue: "الاثنين / Monday",
    metadata: { day_index: 1 },
  },
  {
    labelAr: "الثلاثاء",
    labelEn: "Tuesday",
    workbookValue: "الثلاثاء / Tuesday",
    metadata: { day_index: 2 },
  },
  {
    labelAr: "الأربعاء",
    labelEn: "Wednesday",
    workbookValue: "الأربعاء / Wednesday",
    metadata: { day_index: 3 },
  },
  {
    labelAr: "الخميس",
    labelEn: "Thursday",
    workbookValue: "الخميس / Thursday",
    metadata: { day_index: 4 },
  },
  {
    labelAr: "الجمعة",
    labelEn: "Friday",
    workbookValue: "الجمعة / Friday",
    metadata: { day_index: 5 },
  },
];

export const WEEKLY_PLAN_P21_SKILLS: MasterListSeedItem[] = [
  {
    labelAr: "التفكير الناقد",
    labelEn: "Critical Thinking",
    workbookValue: "التفكير الناقد / Critical Thinking",
  },
  {
    labelAr: "الإبداع",
    labelEn: "Creativity",
    workbookValue: "الإبداع / Creativity",
  },
  {
    labelAr: "التعاون",
    labelEn: "Collaboration",
    workbookValue: "التعاون / Collaboration",
  },
  {
    labelAr: "التواصل",
    labelEn: "Communication",
    workbookValue: "التواصل / Communication",
  },
  {
    labelAr: "حل المشكلات",
    labelEn: "Problem Solving",
    workbookValue: "حل المشكلات / Problem Solving",
  },
  {
    labelAr: "اتخاذ القرار",
    labelEn: "Decision Making",
    workbookValue: "اتخاذ القرار / Decision Making",
  },
  {
    labelAr: "الابتكار",
    labelEn: "Innovation",
    workbookValue: "الابتكار / Innovation",
  },
  {
    labelAr: "التفكير التحليلي",
    labelEn: "Analytical Thinking",
    workbookValue: "التفكير التحليلي / Analytical Thinking",
  },
  {
    labelAr: "التعلم الذاتي",
    labelEn: "Self-Directed Learning",
    workbookValue: "التعلم الذاتي / Self-Directed Learning",
  },
  {
    labelAr: "المبادرة",
    labelEn: "Initiative",
    workbookValue: "المبادرة / Initiative",
  },
  {
    labelAr: "القيادة",
    labelEn: "Leadership",
    workbookValue: "القيادة / Leadership",
  },
  {
    labelAr: "المرونة والتكيف",
    labelEn: "Flexibility & Adaptability",
    workbookValue: "المرونة والتكيف / Flexibility & Adaptability",
  },
  {
    labelAr: "الثقافة الرقمية",
    labelEn: "Digital Literacy",
    workbookValue: "الثقافة الرقمية / Digital Literacy",
  },
  {
    labelAr: "الثقافة المعلوماتية",
    labelEn: "Information Literacy",
    workbookValue: "الثقافة المعلوماتية / Information Literacy",
  },
  {
    labelAr: "الثقافة الإعلامية",
    labelEn: "Media Literacy",
    workbookValue: "الثقافة الإعلامية / Media Literacy",
  },
  {
    labelAr: "الإنتاجية والمساءلة",
    labelEn: "Productivity & Accountability",
    workbookValue: "الإنتاجية والمساءلة / Productivity & Accountability",
  },
  {
    labelAr: "المهارات الاجتماعية والثقافية",
    labelEn: "Social & Cross-Cultural Skills",
    workbookValue: "المهارات الاجتماعية والثقافية / Social & Cross-Cultural Skills",
  },
];

export const WEEKLY_PLAN_SIR_METHODS: MasterListSeedItem[] = [
  { labelAr: "ذاتي", labelEn: "Self", workbookValue: "ذاتي / Self" },
  { labelAr: "الأقران", labelEn: "Peer", workbookValue: "الأقران / Peer" },
  { labelAr: "المعلم", labelEn: "Teacher", workbookValue: "المعلم / Teacher" },
  { labelAr: "تأمل", labelEn: "Reflection", workbookValue: "تأمل / Reflection" },
];

export const WEEKLY_PLAN_UNITS: MasterListSeedItem[] = [
  { labelAr: "الوحدة الأولى", labelEn: "Unit 1", workbookValue: "الوحدة الأولى / Unit 1" },
  { labelAr: "الوحدة الثانية", labelEn: "Unit 2", workbookValue: "الوحدة الثانية / Unit 2" },
  { labelAr: "الوحدة الثالثة", labelEn: "Unit 3", workbookValue: "الوحدة الثالثة / Unit 3" },
  { labelAr: "الوحدة الرابعة", labelEn: "Unit 4", workbookValue: "الوحدة الرابعة / Unit 4" },
  { labelAr: "الوحدة الخامسة", labelEn: "Unit 5", workbookValue: "الوحدة الخامسة / Unit 5" },
  { labelAr: "الوحدة السادسة", labelEn: "Unit 6", workbookValue: "الوحدة السادسة / Unit 6" },
  { labelAr: "الوحدة السابعة", labelEn: "Unit 7", workbookValue: "الوحدة السابعة / Unit 7" },
  { labelAr: "الوحدة الثامنة", labelEn: "Unit 8", workbookValue: "الوحدة الثامنة / Unit 8" },
  { labelAr: "الوحدة التاسعة", labelEn: "Unit 9", workbookValue: "الوحدة التاسعة / Unit 9" },
  { labelAr: "الوحدة العاشرة", labelEn: "Unit 10", workbookValue: "الوحدة العاشرة / Unit 10" },
];

export const WEEKLY_PLAN_SUBJECTS: MasterListSeedItem[] = [
  {
    labelAr: "التربية الإسلامية",
    labelEn: "Islamic Education",
    workbookValue: WEEKLY_PLAN_DEFAULT_SUBJECT,
  },
];

export const WEEKLY_PLAN_SUCCESS_CRITERIA: MasterListSeedItem[] = [
  {
    labelAr:
      "الوحي الإلهي - القرآن الكريم | يُحلّل الطالب أداءه في التلاوة، ويُصحّح الأخطاء بما يحقق القراءة الصحيحة للآيات.",
    labelEn:
      "Divine Revelation - Holy Qur'an | The student analyzes recitation performance and corrects errors to achieve accurate Qur'anic reading.",
    workbookValue:
      "الوحي الإلهي - القرآن الكريم | يُحلّل الطالب أداءه في التلاوة، ويُصحّح الأخطاء بما يحقق القراءة الصحيحة للآيات. / Divine Revelation - Holy Qur'an | The student analyzes recitation performance and corrects errors to achieve accurate Qur'anic reading.",
    metadata: { domain_prefix_ar: "الوحي الإلهي - القرآن الكريم", domain_prefix_en: "Divine Revelation - Holy Qur'an" },
  },
  {
    labelAr:
      "الوحي الإلهي - القرآن الكريم | يُطبّق الطالب أحكام التجويد في مواضعها، ويُبرّر سبب تطبيق الحكم في الآيات.",
    labelEn:
      "Divine Revelation - Holy Qur'an | The student applies Tajweed rules accurately and justifies why each rule is used in the verses.",
    workbookValue:
      "الوحي الإلهي - القرآن الكريم | يُطبّق الطالب أحكام التجويد في مواضعها، ويُبرّر سبب تطبيق الحكم في الآيات. / Divine Revelation - Holy Qur'an | The student applies Tajweed rules accurately and justifies why each rule is used in the verses.",
    metadata: { domain_prefix_ar: "الوحي الإلهي - القرآن الكريم", domain_prefix_en: "Divine Revelation - Holy Qur'an" },
  },
  {
    labelAr:
      "الوحي الإلهي - القرآن الكريم | يستظهر الطالب الآيات المقررة بدقة، ويُوظّف الحفظ في تفسير المعنى والاستدلال.",
    labelEn:
      "Divine Revelation - Holy Qur'an | The student memorizes the assigned verses accurately and uses memorization to explain meaning and support reasoning.",
    workbookValue:
      "الوحي الإلهي - القرآن الكريم | يستظهر الطالب الآيات المقررة بدقة، ويُوظّف الحفظ في تفسير المعنى والاستدلال. / Divine Revelation - Holy Qur'an | The student memorizes the assigned verses accurately and uses memorization to explain meaning and support reasoning.",
    metadata: { domain_prefix_ar: "الوحي الإلهي - القرآن الكريم", domain_prefix_en: "Divine Revelation - Holy Qur'an" },
  },
  {
    labelAr:
      "الوحي الإلهي - القرآن الكريم | يُفسّر الطالب الآيات في ضوء سياقها، ويستنتج الأفكار الرئيسة والمعاني الدالة عليها.",
    labelEn:
      "Divine Revelation - Holy Qur'an | The student interprets verses in context and infers their main ideas and significant meanings.",
    workbookValue:
      "الوحي الإلهي - القرآن الكريم | يُفسّر الطالب الآيات في ضوء سياقها، ويستنتج الأفكار الرئيسة والمعاني الدالة عليها. / Divine Revelation - Holy Qur'an | The student interprets verses in context and infers their main ideas and significant meanings.",
    metadata: { domain_prefix_ar: "الوحي الإلهي - القرآن الكريم", domain_prefix_en: "Divine Revelation - Holy Qur'an" },
  },
  {
    labelAr:
      "الوحي الإلهي - القرآن الكريم | يستنبط الطالب الهدايات والقيم من الآيات، ويُقيّم كيفية تطبيقها في مواقف حياتية معاصرة.",
    labelEn:
      "Divine Revelation - Holy Qur'an | The student derives guidance and values from the verses and evaluates how to apply them in contemporary life situations.",
    workbookValue:
      "الوحي الإلهي - القرآن الكريم | يستنبط الطالب الهدايات والقيم من الآيات، ويُقيّم كيفية تطبيقها في مواقف حياتية معاصرة. / Divine Revelation - Holy Qur'an | The student derives guidance and values from the verses and evaluates how to apply them in contemporary life situations.",
    metadata: { domain_prefix_ar: "الوحي الإلهي - القرآن الكريم", domain_prefix_en: "Divine Revelation - Holy Qur'an" },
  },
  {
    labelAr:
      "الوحي الإلهي - الحديث الشريف | يقرأ الطالب الحديث قراءة صحيحة، ثم يُحلّل ألفاظه وسياقه ليشرح معناه العام بأسلوبه.",
    labelEn:
      "Divine Revelation - Prophetic Hadith | The student reads the Hadith accurately, analyzes its wording and context, and explains its overall meaning in their own words.",
    workbookValue:
      "الوحي الإلهي - الحديث الشريف | يقرأ الطالب الحديث قراءة صحيحة، ثم يُحلّل ألفاظه وسياقه ليشرح معناه العام بأسلوبه. / Divine Revelation - Prophetic Hadith | The student reads the Hadith accurately, analyzes its wording and context, and explains its overall meaning in their own words.",
    metadata: { domain_prefix_ar: "الوحي الإلهي - الحديث الشريف", domain_prefix_en: "Divine Revelation - Prophetic Hadith" },
  },
  {
    labelAr:
      "الوحي الإلهي - الحديث الشريف | يستنتج الطالب القيم والتوجيهات الواردة في الحديث، ويُبرّر استنتاجاته بأدلة من النص.",
    labelEn:
      "Divine Revelation - Prophetic Hadith | The student infers values and guidance from the Hadith and justifies conclusions with evidence from the text.",
    workbookValue:
      "الوحي الإلهي - الحديث الشريف | يستنتج الطالب القيم والتوجيهات الواردة في الحديث، ويُبرّر استنتاجاته بأدلة من النص. / Divine Revelation - Prophetic Hadith | The student infers values and guidance from the Hadith and justifies conclusions with evidence from the text.",
    metadata: { domain_prefix_ar: "الوحي الإلهي - الحديث الشريف", domain_prefix_en: "Divine Revelation - Prophetic Hadith" },
  },
  {
    labelAr:
      "الوحي الإلهي - الحديث الشريف | يُقارن الطالب بين مواقف حياتية مختلفة في ضوء توجيهات الحديث الشريف.",
    labelEn:
      "Divine Revelation - Prophetic Hadith | The student compares different life situations in light of the guidance of the Hadith.",
    workbookValue:
      "الوحي الإلهي - الحديث الشريف | يُقارن الطالب بين مواقف حياتية مختلفة في ضوء توجيهات الحديث الشريف. / Divine Revelation - Prophetic Hadith | The student compares different life situations in light of the guidance of the Hadith.",
    metadata: { domain_prefix_ar: "الوحي الإلهي - الحديث الشريف", domain_prefix_en: "Divine Revelation - Prophetic Hadith" },
  },
  {
    labelAr:
      "الوحي الإلهي - الحديث الشريف | يُقيّم الطالب سلوكًا أو موقفًا معاصرًا وفق ما يرشد إليه الحديث، ويُبرّر حكمه.",
    labelEn:
      "Divine Revelation - Prophetic Hadith | The student evaluates a contemporary behavior or situation using the guidance of the Hadith and justifies the judgment.",
    workbookValue:
      "الوحي الإلهي - الحديث الشريف | يُقيّم الطالب سلوكًا أو موقفًا معاصرًا وفق ما يرشد إليه الحديث، ويُبرّر حكمه. / Divine Revelation - Prophetic Hadith | The student evaluates a contemporary behavior or situation using the guidance of the Hadith and justifies the judgment.",
    metadata: { domain_prefix_ar: "الوحي الإلهي - الحديث الشريف", domain_prefix_en: "Divine Revelation - Prophetic Hadith" },
  },
  {
    labelAr:
      "الوحي الإلهي - الحديث الشريف | يُصمّم الطالب تطبيقًا عمليًا يحوّل قيمة من قيم الحديث إلى ممارسة في حياته اليومية.",
    labelEn:
      "Divine Revelation - Prophetic Hadith | The student designs a practical application that turns a value from the Hadith into daily practice.",
    workbookValue:
      "الوحي الإلهي - الحديث الشريف | يُصمّم الطالب تطبيقًا عمليًا يحوّل قيمة من قيم الحديث إلى ممارسة في حياته اليومية. / Divine Revelation - Prophetic Hadith | The student designs a practical application that turns a value from the Hadith into daily practice.",
    metadata: { domain_prefix_ar: "الوحي الإلهي - الحديث الشريف", domain_prefix_en: "Divine Revelation - Prophetic Hadith" },
  },
  {
    labelAr:
      "العقيدة الإسلامية | يُحلّل الطالب أركان الإيمان، ويبيّن العلاقات بينها وأثرها في بناء التصور الإسلامي.",
    labelEn:
      "Islamic Creed | The student analyzes the pillars of faith, explains their connections, and evaluates their impact on an Islamic worldview.",
    workbookValue:
      "العقيدة الإسلامية | يُحلّل الطالب أركان الإيمان، ويبيّن العلاقات بينها وأثرها في بناء التصور الإسلامي. / Islamic Creed | The student analyzes the pillars of faith, explains their connections, and evaluates their impact on an Islamic worldview.",
    metadata: { domain_prefix_ar: "العقيدة الإسلامية", domain_prefix_en: "Islamic Creed" },
  },
  {
    labelAr: "العقيدة الإسلامية | يستدل الطالب على حقائق الإيمان بأدلة مناسبة، ويُبرّر صحة استدلاله.",
    labelEn:
      "Islamic Creed | The student supports truths of faith with appropriate evidence and justifies the validity of the reasoning.",
    workbookValue:
      "العقيدة الإسلامية | يستدل الطالب على حقائق الإيمان بأدلة مناسبة، ويُبرّر صحة استدلاله. / Islamic Creed | The student supports truths of faith with appropriate evidence and justifies the validity of the reasoning.",
    metadata: { domain_prefix_ar: "العقيدة الإسلامية", domain_prefix_en: "Islamic Creed" },
  },
  {
    labelAr:
      "العقيدة الإسلامية | يُقيّم الطالب أثر العقيدة في السلوك والطمأنينة وتحمل المسؤولية في مواقف واقعية.",
    labelEn:
      "Islamic Creed | The student evaluates the impact of faith on behavior, inner peace, and responsibility in real-life situations.",
    workbookValue:
      "العقيدة الإسلامية | يُقيّم الطالب أثر العقيدة في السلوك والطمأنينة وتحمل المسؤولية في مواقف واقعية. / Islamic Creed | The student evaluates the impact of faith on behavior, inner peace, and responsibility in real-life situations.",
    metadata: { domain_prefix_ar: "العقيدة الإسلامية", domain_prefix_en: "Islamic Creed" },
  },
  {
    labelAr: "العقيدة الإسلامية | ينقد الطالب مفهومًا خاطئًا مرتبطًا بالعقيدة، ويصححه بالحجة والاعتدال.",
    labelEn:
      "Islamic Creed | The student critiques a misconception related to faith and corrects it using evidence and moderation.",
    workbookValue:
      "العقيدة الإسلامية | ينقد الطالب مفهومًا خاطئًا مرتبطًا بالعقيدة، ويصححه بالحجة والاعتدال. / Islamic Creed | The student critiques a misconception related to faith and corrects it using evidence and moderation.",
    metadata: { domain_prefix_ar: "العقيدة الإسلامية", domain_prefix_en: "Islamic Creed" },
  },
  {
    labelAr:
      "العقيدة الإسلامية | يُوظّف الطالب مبادئ العقيدة في اتخاذ موقف متزن تجاه قضية حياتية أو فكرية.",
    labelEn:
      "Islamic Creed | The student applies principles of Islamic creed to form a balanced position on a life or intellectual issue.",
    workbookValue:
      "العقيدة الإسلامية | يُوظّف الطالب مبادئ العقيدة في اتخاذ موقف متزن تجاه قضية حياتية أو فكرية. / Islamic Creed | The student applies principles of Islamic creed to form a balanced position on a life or intellectual issue.",
    metadata: { domain_prefix_ar: "العقيدة الإسلامية", domain_prefix_en: "Islamic Creed" },
  },
  {
    labelAr:
      "قيم الإسلام وآدابه | يُحلّل الطالب مواقف حياتية لتحديد القيم الإسلامية الظاهرة فيها ومدى تحققها.",
    labelEn:
      "Islamic Values and Manners | The student analyzes life situations to identify the Islamic values present and judge the extent to which they are demonstrated.",
    workbookValue:
      "قيم الإسلام وآدابه | يُحلّل الطالب مواقف حياتية لتحديد القيم الإسلامية الظاهرة فيها ومدى تحققها. / Islamic Values and Manners | The student analyzes life situations to identify the Islamic values present and judge the extent to which they are demonstrated.",
    metadata: { domain_prefix_ar: "قيم الإسلام وآدابه", domain_prefix_en: "Islamic Values and Manners" },
  },
  {
    labelAr:
      "قيم الإسلام وآدابه | يُقارن الطالب بين بدائل سلوكية، ويُبرّر الاختيار الأكثر اتساقًا مع الصدق والأمانة والتسامح والرحمة والتعاون.",
    labelEn:
      "Islamic Values and Manners | The student compares behavioral alternatives and justifies the choice most consistent with honesty, trustworthiness, tolerance, mercy, and cooperation.",
    workbookValue:
      "قيم الإسلام وآدابه | يُقارن الطالب بين بدائل سلوكية، ويُبرّر الاختيار الأكثر اتساقًا مع الصدق والأمانة والتسامح والرحمة والتعاون. / Islamic Values and Manners | The student compares behavioral alternatives and justifies the choice most consistent with honesty, trustworthiness, tolerance, mercy, and cooperation.",
    metadata: { domain_prefix_ar: "قيم الإسلام وآدابه", domain_prefix_en: "Islamic Values and Manners" },
  },
  {
    labelAr:
      "قيم الإسلام وآدابه | يُقيّم الطالب سلوكًا في ضوء احترام الوالدين وكبار السن وأصحاب الثقافات المختلفة.",
    labelEn:
      "Islamic Values and Manners | The student evaluates behavior in light of respect for parents, elders, and people from different cultures.",
    workbookValue:
      "قيم الإسلام وآدابه | يُقيّم الطالب سلوكًا في ضوء احترام الوالدين وكبار السن وأصحاب الثقافات المختلفة. / Islamic Values and Manners | The student evaluates behavior in light of respect for parents, elders, and people from different cultures.",
    metadata: { domain_prefix_ar: "قيم الإسلام وآدابه", domain_prefix_en: "Islamic Values and Manners" },
  },
  {
    labelAr:
      "قيم الإسلام وآدابه | يُصمّم الطالب استجابة عملية تعكس المسؤولية والانضباط والإيجابية في موقف واقعي.",
    labelEn:
      "Islamic Values and Manners | The student designs a practical response that demonstrates responsibility, self-discipline, and positivity in a real-life situation.",
    workbookValue:
      "قيم الإسلام وآدابه | يُصمّم الطالب استجابة عملية تعكس المسؤولية والانضباط والإيجابية في موقف واقعي. / Islamic Values and Manners | The student designs a practical response that demonstrates responsibility, self-discipline, and positivity in a real-life situation.",
    metadata: { domain_prefix_ar: "قيم الإسلام وآدابه", domain_prefix_en: "Islamic Values and Manners" },
  },
  {
    labelAr:
      "قيم الإسلام وآدابه | يحوّل الطالب قيمة إسلامية إلى ممارسة أو مبادرة قابلة للتطبيق في حياته اليومية.",
    labelEn:
      "Islamic Values and Manners | The student transforms an Islamic value into a practical habit or initiative that can be applied in daily life.",
    workbookValue:
      "قيم الإسلام وآدابه | يحوّل الطالب قيمة إسلامية إلى ممارسة أو مبادرة قابلة للتطبيق في حياته اليومية. / Islamic Values and Manners | The student transforms an Islamic value into a practical habit or initiative that can be applied in daily life.",
    metadata: { domain_prefix_ar: "قيم الإسلام وآدابه", domain_prefix_en: "Islamic Values and Manners" },
  },
  {
    labelAr:
      "أحكام الإسلام ومقاصده | يُحلّل الطالب خطوات العبادة أو الحكم الشرعي، ويُميّز الأداء الصحيح من غير الصحيح.",
    labelEn:
      "Islamic Rulings and Objectives | The student analyzes the steps of an act of worship or a legal ruling and distinguishes correct from incorrect practice.",
    workbookValue:
      "أحكام الإسلام ومقاصده | يُحلّل الطالب خطوات العبادة أو الحكم الشرعي، ويُميّز الأداء الصحيح من غير الصحيح. / Islamic Rulings and Objectives | The student analyzes the steps of an act of worship or a legal ruling and distinguishes correct from incorrect practice.",
    metadata: { domain_prefix_ar: "أحكام الإسلام ومقاصده", domain_prefix_en: "Islamic Rulings and Objectives" },
  },
  {
    labelAr:
      "أحكام الإسلام ومقاصده | يُطبّق الطالب أحكام الطهارة والصلاة والصيام والزكاة والحج تطبيقًا صحيحًا في مواقف عملية.",
    labelEn:
      "Islamic Rulings and Objectives | The student accurately applies the rulings of purification, prayer, fasting, Zakat, and Hajj in practical situations.",
    workbookValue:
      "أحكام الإسلام ومقاصده | يُطبّق الطالب أحكام الطهارة والصلاة والصيام والزكاة والحج تطبيقًا صحيحًا في مواقف عملية. / Islamic Rulings and Objectives | The student accurately applies the rulings of purification, prayer, fasting, Zakat, and Hajj in practical situations.",
    metadata: { domain_prefix_ar: "أحكام الإسلام ومقاصده", domain_prefix_en: "Islamic Rulings and Objectives" },
  },
  {
    labelAr:
      "أحكام الإسلام ومقاصده | يستنتج الطالب مقاصد الشريعة من الأحكام، ويربطها بحفظ الدين والنفس والعقل والنسل والمال.",
    labelEn:
      "Islamic Rulings and Objectives | The student infers the objectives of Sharia from rulings and connects them to preserving religion, life, intellect, lineage, and wealth.",
    workbookValue:
      "أحكام الإسلام ومقاصده | يستنتج الطالب مقاصد الشريعة من الأحكام، ويربطها بحفظ الدين والنفس والعقل والنسل والمال. / Islamic Rulings and Objectives | The student infers the objectives of Sharia from rulings and connects them to preserving religion, life, intellect, lineage, and wealth.",
    metadata: { domain_prefix_ar: "أحكام الإسلام ومقاصده", domain_prefix_en: "Islamic Rulings and Objectives" },
  },
  {
    labelAr:
      "أحكام الإسلام ومقاصده | يُقيّم الطالب موقفًا معاصرًا في ضوء الحكم الشرعي ومقصده، ويُبرّر حكمه.",
    labelEn:
      "Islamic Rulings and Objectives | The student evaluates a contemporary situation in light of the relevant Islamic ruling and its objective, and justifies the judgment.",
    workbookValue:
      "أحكام الإسلام ومقاصده | يُقيّم الطالب موقفًا معاصرًا في ضوء الحكم الشرعي ومقصده، ويُبرّر حكمه. / Islamic Rulings and Objectives | The student evaluates a contemporary situation in light of the relevant Islamic ruling and its objective, and justifies the judgment.",
    metadata: { domain_prefix_ar: "أحكام الإسلام ومقاصده", domain_prefix_en: "Islamic Rulings and Objectives" },
  },
  {
    labelAr:
      "أحكام الإسلام ومقاصده | يُوظّف الطالب الأحكام والمقاصد الشرعية لاقتراح حل متزن لموقف معاصر.",
    labelEn:
      "Islamic Rulings and Objectives | The student applies Islamic rulings and objectives to propose a balanced solution to a contemporary situation.",
    workbookValue:
      "أحكام الإسلام ومقاصده | يُوظّف الطالب الأحكام والمقاصد الشرعية لاقتراح حل متزن لموقف معاصر. / Islamic Rulings and Objectives | The student applies Islamic rulings and objectives to propose a balanced solution to a contemporary situation.",
    metadata: { domain_prefix_ar: "أحكام الإسلام ومقاصده", domain_prefix_en: "Islamic Rulings and Objectives" },
  },
  {
    labelAr:
      "السيرة والشخصيات | يُحلّل الطالب موقفًا من السيرة النبوية، ويستنتج دوافعه ونتائجه ودروسه.",
    labelEn:
      "Prophetic Biography and Personalities | The student analyzes an event from the Prophetic biography and infers its motives, outcomes, and lessons.",
    workbookValue:
      "السيرة والشخصيات | يُحلّل الطالب موقفًا من السيرة النبوية، ويستنتج دوافعه ونتائجه ودروسه. / Prophetic Biography and Personalities | The student analyzes an event from the Prophetic biography and infers its motives, outcomes, and lessons.",
    metadata: { domain_prefix_ar: "السيرة والشخصيات", domain_prefix_en: "Prophetic Biography and Personalities" },
  },
  {
    labelAr:
      "السيرة والشخصيات | يُقارن الطالب بين مواقف للرسول ﷺ والصحابة والشخصيات الإسلامية المؤثرة، ويستخلص السمات القيادية والأخلاقية.",
    labelEn:
      "Prophetic Biography and Personalities | The student compares situations involving the Prophet ﷺ, the Companions, and influential Muslim figures and derives leadership and moral qualities.",
    workbookValue:
      "السيرة والشخصيات | يُقارن الطالب بين مواقف للرسول ﷺ والصحابة والشخصيات الإسلامية المؤثرة، ويستخلص السمات القيادية والأخلاقية. / Prophetic Biography and Personalities | The student compares situations involving the Prophet ﷺ, the Companions, and influential Muslim figures and derives leadership and moral qualities.",
    metadata: { domain_prefix_ar: "السيرة والشخصيات", domain_prefix_en: "Prophetic Biography and Personalities" },
  },
  {
    labelAr:
      "السيرة والشخصيات | يُقيّم الطالب قرارًا أو موقفًا تاريخيًا في ضوء القيم والمبادئ الإسلامية.",
    labelEn:
      "Prophetic Biography and Personalities | The student evaluates a historical decision or situation in light of Islamic values and principles.",
    workbookValue:
      "السيرة والشخصيات | يُقيّم الطالب قرارًا أو موقفًا تاريخيًا في ضوء القيم والمبادئ الإسلامية. / Prophetic Biography and Personalities | The student evaluates a historical decision or situation in light of Islamic values and principles.",
    metadata: { domain_prefix_ar: "السيرة والشخصيات", domain_prefix_en: "Prophetic Biography and Personalities" },
  },
  {
    labelAr:
      "السيرة والشخصيات | يستنتج الطالب الدروس القيادية والأخلاقية من السيرة، ويُبرّرها بالشواهد.",
    labelEn:
      "Prophetic Biography and Personalities | The student derives leadership and ethical lessons from the Seerah and justifies them with evidence.",
    workbookValue:
      "السيرة والشخصيات | يستنتج الطالب الدروس القيادية والأخلاقية من السيرة، ويُبرّرها بالشواهد. / Prophetic Biography and Personalities | The student derives leadership and ethical lessons from the Seerah and justifies them with evidence.",
    metadata: { domain_prefix_ar: "السيرة والشخصيات", domain_prefix_en: "Prophetic Biography and Personalities" },
  },
  {
    labelAr:
      "السيرة والشخصيات | يُوظّف الطالب درسًا مستفادًا من السيرة أو الشخصيات الإسلامية في موقف من حياته اليومية.",
    labelEn:
      "Prophetic Biography and Personalities | The student applies a lesson from the Seerah or Islamic personalities to a situation in daily life.",
    workbookValue:
      "السيرة والشخصيات | يُوظّف الطالب درسًا مستفادًا من السيرة أو الشخصيات الإسلامية في موقف من حياته اليومية. / Prophetic Biography and Personalities | The student applies a lesson from the Seerah or Islamic personalities to a situation in daily life.",
    metadata: { domain_prefix_ar: "السيرة والشخصيات", domain_prefix_en: "Prophetic Biography and Personalities" },
  },
  {
    labelAr:
      "الهوية والقضايا المعاصرة | يُحلّل الطالب عناصر الهوية الإسلامية والوطنية، ويبيّن أثرها في السلوك والانتماء.",
    labelEn:
      "Identity and Contemporary Issues | The student analyzes elements of Islamic and national identity and explains their impact on behavior and belonging.",
    workbookValue:
      "الهوية والقضايا المعاصرة | يُحلّل الطالب عناصر الهوية الإسلامية والوطنية، ويبيّن أثرها في السلوك والانتماء. / Identity and Contemporary Issues | The student analyzes elements of Islamic and national identity and explains their impact on behavior and belonging.",
    metadata: { domain_prefix_ar: "الهوية والقضايا المعاصرة", domain_prefix_en: "Identity and Contemporary Issues" },
  },
  {
    labelAr:
      "الهوية والقضايا المعاصرة | يُقيّم الطالب مواقف تعكس الولاء والانتماء لدولة الإمارات وقيادتها، ويُبرّر حكمه.",
    labelEn:
      "Identity and Contemporary Issues | The student evaluates situations that reflect loyalty and belonging to the UAE and its leadership and justifies the judgment.",
    workbookValue:
      "الهوية والقضايا المعاصرة | يُقيّم الطالب مواقف تعكس الولاء والانتماء لدولة الإمارات وقيادتها، ويُبرّر حكمه. / Identity and Contemporary Issues | The student evaluates situations that reflect loyalty and belonging to the UAE and its leadership and justifies the judgment.",
    metadata: { domain_prefix_ar: "الهوية والقضايا المعاصرة", domain_prefix_en: "Identity and Contemporary Issues" },
  },
  {
    labelAr:
      "الهوية والقضايا المعاصرة | يُقارن الطالب بين استجابات مختلفة لقضية معاصرة في ضوء الوسطية والاعتدال والتسامح والتعايش.",
    labelEn:
      "Identity and Contemporary Issues | The student compares different responses to a contemporary issue in light of moderation, tolerance, and coexistence.",
    workbookValue:
      "الهوية والقضايا المعاصرة | يُقارن الطالب بين استجابات مختلفة لقضية معاصرة في ضوء الوسطية والاعتدال والتسامح والتعايش. / Identity and Contemporary Issues | The student compares different responses to a contemporary issue in light of moderation, tolerance, and coexistence.",
    metadata: { domain_prefix_ar: "الهوية والقضايا المعاصرة", domain_prefix_en: "Identity and Contemporary Issues" },
  },
  {
    labelAr:
      "الهوية والقضايا المعاصرة | يُحلّل الطالب قضية اجتماعية أو رقمية أو بيئية، ويقترح تعاملًا واعيًا ومسؤولًا معها.",
    labelEn:
      "Identity and Contemporary Issues | The student analyzes a social, digital, or environmental issue and proposes a conscious and responsible response.",
    workbookValue:
      "الهوية والقضايا المعاصرة | يُحلّل الطالب قضية اجتماعية أو رقمية أو بيئية، ويقترح تعاملًا واعيًا ومسؤولًا معها. / Identity and Contemporary Issues | The student analyzes a social, digital, or environmental issue and proposes a conscious and responsible response.",
    metadata: { domain_prefix_ar: "الهوية والقضايا المعاصرة", domain_prefix_en: "Identity and Contemporary Issues" },
  },
  {
    labelAr:
      "الهوية والقضايا المعاصرة | ينقد الطالب مظاهر التطرف والكراهية والتمييز، ويُبرّر رفضها في ضوء القيم الإسلامية.",
    labelEn:
      "Identity and Contemporary Issues | The student critiques manifestations of extremism, hatred, and discrimination and justifies rejecting them in light of Islamic values.",
    workbookValue:
      "الهوية والقضايا المعاصرة | ينقد الطالب مظاهر التطرف والكراهية والتمييز، ويُبرّر رفضها في ضوء القيم الإسلامية. / Identity and Contemporary Issues | The student critiques manifestations of extremism, hatred, and discrimination and justifies rejecting them in light of Islamic values.",
    metadata: { domain_prefix_ar: "الهوية والقضايا المعاصرة", domain_prefix_en: "Identity and Contemporary Issues" },
  },
];

/** Seed catalog for repairing corrupted Supabase master-list rows. */
export const WEEKLY_PLAN_MASTER_LIST_SEED: Record<
  string,
  { labelAr: string; labelEn: string; items: MasterListSeedItem[] }
> = {
  domains: { labelAr: "المحاور", labelEn: "Domains", items: WEEKLY_PLAN_DOMAINS },
  phases: { labelAr: "المرحلة", labelEn: "Phase", items: WEEKLY_PLAN_PHASES },
  grades: { labelAr: "الصف", labelEn: "Grade", items: WEEKLY_PLAN_GRADES },
  sections: { labelAr: "الشعبة", labelEn: "Section", items: WEEKLY_PLAN_SECTIONS },
  days: { labelAr: "اليوم", labelEn: "Day", items: WEEKLY_PLAN_DAYS },
  p21_skills: { labelAr: "مهارات القرن 21", labelEn: "21st Century Skills", items: WEEKLY_PLAN_P21_SKILLS },
  sir_methods: { labelAr: "طريقة SIR", labelEn: "SIR Method", items: WEEKLY_PLAN_SIR_METHODS },
  units: { labelAr: "الوحدة", labelEn: "Unit", items: WEEKLY_PLAN_UNITS },
  success_criteria: {
    labelAr: "معايير النجاح (HOTS)",
    labelEn: "Success Criteria (HOTS)",
    items: WEEKLY_PLAN_SUCCESS_CRITERIA,
  },
  subjects: { labelAr: "المادة", labelEn: "Subject", items: WEEKLY_PLAN_SUBJECTS },
};

export const WEEKLY_PLAN_MASTER_LIST_COUNTS = {
  domains: WEEKLY_PLAN_DOMAINS.length,
  phases: WEEKLY_PLAN_PHASES.length,
  grades: WEEKLY_PLAN_GRADES.length,
  sections: WEEKLY_PLAN_SECTIONS.length,
  days: WEEKLY_PLAN_DAYS.length,
  p21_skills: WEEKLY_PLAN_P21_SKILLS.length,
  sir_methods: WEEKLY_PLAN_SIR_METHODS.length,
  units: WEEKLY_PLAN_UNITS.length,
  success_criteria: WEEKLY_PLAN_SUCCESS_CRITERIA.length,
  subjects: WEEKLY_PLAN_SUBJECTS.length,
} as const;
