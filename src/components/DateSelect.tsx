import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const MONTHS = [
  { value: "1", label: "January" }, { value: "2", label: "February" },
  { value: "3", label: "March" }, { value: "4", label: "April" },
  { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" },
  { value: "9", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

const YEAR_SPAN_FORWARD = 5;

function daysInMonth(month: string, year: string): number {
  if (!month) return 31;
  const y = year ? Number(year) : new Date().getFullYear();
  return new Date(y, Number(month), 0).getDate();
}

export interface DateSelectValue {
  day: string;
  month: string;
  year: string;
}

export default function DateSelect({
  label,
  value,
  onChange,
  yearsBack = 1,
}: {
  label: string;
  value: DateSelectValue;
  onChange: (next: DateSelectValue) => void;
  /** How many years before the current year to include in the Year dropdown. */
  yearsBack?: number;
}) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: yearsBack + YEAR_SPAN_FORWARD + 1 }, (_, i) => String(currentYear - yearsBack + i)),
    [currentYear, yearsBack]
  );
  const days = useMemo(() => {
    const count = daysInMonth(value.month, value.year);
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }, [value.month, value.year]);

  // If the selected day no longer fits the chosen month (e.g. switching Jan 31 -> Feb), drop it.
  const day = value.day && Number(value.day) <= days.length ? value.day : "";

  return (
    <div className="space-y-2">
      <Label>{label} <span className="text-muted-foreground text-xs font-normal">(month &amp; year required)</span></Label>
      <div className="grid grid-cols-3 gap-2">
        <Select value={day} onValueChange={(d) => onChange({ ...value, day: d })}>
          <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
          <SelectContent>
            {days.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={value.month} onValueChange={(m) => onChange({ ...value, month: m })}>
          <SelectTrigger><SelectValue placeholder="Month *" /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={value.year} onValueChange={(y) => onChange({ ...value, year: y })}>
          <SelectTrigger><SelectValue placeholder="Year *" /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
