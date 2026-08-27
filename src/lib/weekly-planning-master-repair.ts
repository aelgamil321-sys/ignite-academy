import {
  WEEKLY_PLAN_MASTER_LIST_SEED,
} from "@/lib/weekly-planning-master-data";

type RepairableMasterListItem = {
  label_ar: string;
  label_en: string;
  sort_order: number;
  metadata?: Record<string, unknown> | null;
};

type RepairableMasterList = {
  list_key: string;
  label_ar: string;
  label_en: string;
  items?: RepairableMasterListItem[];
};

export function isCorruptedMasterListText(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  const text = value.trim();
  if (text.includes("\uFFFD")) return true;
  if (/^\?+$/.test(text)) return true;
  const questionMarks = (text.match(/\?/g) ?? []).length;
  if (questionMarks >= 3 && questionMarks / text.length > 0.25) return true;
  return false;
}

function repairMasterListItem(
  item: RepairableMasterListItem,
  listKey: string,
): RepairableMasterListItem {
  const seed = WEEKLY_PLAN_MASTER_LIST_SEED[listKey]?.items[item.sort_order - 1];
  if (!seed) return item;

  const label_ar = isCorruptedMasterListText(item.label_ar) ? seed.labelAr : item.label_ar;
  const label_en = isCorruptedMasterListText(item.label_en) ? seed.labelEn : item.label_en;
  const workbookRaw = item.metadata?.workbook_value;
  const workbook_value =
    typeof workbookRaw === "string" && !isCorruptedMasterListText(workbookRaw)
      ? workbookRaw
      : seed.workbookValue;

  return {
    ...item,
    label_ar,
    label_en,
    metadata: {
      ...(item.metadata ?? {}),
      ...seed.metadata,
      workbook_value: workbook_value,
    },
  };
}

export function repairWeeklyPlanMasterLists<T extends RepairableMasterList>(lists: T[]): T[] {
  return lists.map((list) => {
    const seedList = WEEKLY_PLAN_MASTER_LIST_SEED[list.list_key];
    const label_ar =
      seedList && isCorruptedMasterListText(list.label_ar) ? seedList.labelAr : list.label_ar;
    const label_en =
      seedList && isCorruptedMasterListText(list.label_en) ? seedList.labelEn : list.label_en;
    const items = [...(list.items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => repairMasterListItem(item, list.list_key));

    return { ...list, label_ar, label_en, items };
  });
}

export function masterListItemsByKey<T extends RepairableMasterList>(
  lists: T[],
  listKey: string,
): RepairableMasterListItem[] {
  const list = lists.find((entry) => entry.list_key === listKey);
  return list?.items ?? [];
}

export function masterListItemValueFromSeed(item: RepairableMasterListItem): string {
  const workbook = item.metadata?.workbook_value;
  if (typeof workbook === "string" && workbook.trim()) return workbook.trim();
  if (item.label_ar && item.label_en) return `${item.label_ar} / ${item.label_en}`;
  return item.label_ar || item.label_en;
}

export function resolveStoredMasterListValue(
  stored: string | null | undefined,
  items: RepairableMasterListItem[],
): string | null {
  if (!stored?.trim()) return null;
  const trimmed = stored.trim();

  const exact = items.find((item) => masterListItemValueFromSeed(item) === trimmed);
  if (exact) return masterListItemValueFromSeed(exact);

  const byLabel = items.find(
    (item) => item.label_en === trimmed || item.label_ar === trimmed,
  );
  if (byLabel) return masterListItemValueFromSeed(byLabel);

  const slashIdx = trimmed.indexOf("/");
  const englishPart = slashIdx >= 0 ? trimmed.slice(slashIdx + 1).trim() : trimmed;
  if (englishPart) {
    const byEnglish = items.find(
      (item) =>
        item.label_en === englishPart ||
        englishPart.includes(item.label_en) ||
        item.label_en.includes(englishPart),
    );
    if (byEnglish) return masterListItemValueFromSeed(byEnglish);
  }

  if (isCorruptedMasterListText(trimmed)) {
    return null;
  }

  return trimmed;
}

export function isNonWorkingPlanDate(planDate: string): boolean {
  const parts = planDate.split("-");
  if (parts.length !== 3) return false;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) return false;
  const jsDay = new Date(year, month - 1, day).getDay();
  return jsDay === 0 || jsDay === 6;
}

export function dayWorkbookValueFromPlanDate(
  planDate: string,
  dayItems: RepairableMasterListItem[],
): string | null {
  const parts = planDate.split("-");
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  const jsDay = date.getDay();
  if (jsDay === 0 || jsDay === 6) return null;

  const byIndex = dayItems.find((item) => item.metadata?.day_index === jsDay);
  if (byIndex) return masterListItemValueFromSeed(byIndex);

  const sorted = [...dayItems].sort((a, b) => a.sort_order - b.sort_order);
  const schoolDayIndex = jsDay - 1;
  if (schoolDayIndex < 0 || schoolDayIndex >= sorted.length) return null;
  const item = sorted[schoolDayIndex];
  return item ? masterListItemValueFromSeed(item) : null;
}

export function filterDifferentiationToStudents(
  category: { student_ids?: string[]; student_names_snapshot?: string[]; notes?: string },
  validStudentIds: Set<string>,
): { student_ids: string[]; student_names_snapshot: string[]; notes?: string } {
  const ids = category.student_ids ?? [];
  const names = category.student_names_snapshot ?? [];
  const filteredIds: string[] = [];
  const filteredNames: string[] = [];
  ids.forEach((id, index) => {
    if (validStudentIds.has(id)) {
      filteredIds.push(id);
      filteredNames.push(names[index] ?? "");
    }
  });
  return {
    student_ids: filteredIds,
    student_names_snapshot: filteredNames,
    notes: category.notes,
  };
}
