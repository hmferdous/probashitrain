import type { DateSelectValue } from "@/components/DateSelect";

// ISO "2026-07-05" -> {day:"5", month:"7", year:"2026"} (DateSelect uses unpadded values)
export function isoToDateSelectValue(iso: string | null): DateSelectValue {
  if (!iso) return { day: "", month: "", year: "" };
  const [y, m, d] = iso.split("-");
  return { day: String(Number(d)), month: String(Number(m)), year: y };
}

export function dateSelectValueToISO(v: DateSelectValue): string | null {
  if (!v.month || !v.year) return null;
  return `${v.year}-${v.month.padStart(2, "0")}-${(v.day || "01").padStart(2, "0")}`;
}
