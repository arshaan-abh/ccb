export function formatTimePeriod(lang: string, minutes: number): string {
  const normalized = Number.isFinite(minutes) ? Math.round(minutes) : 0;
  const safeMinutes = normalized > 0 ? normalized : 1440;
  const isFa = lang === "fa";

  const minutesPerHour = 60;
  const minutesPerDay = 24 * minutesPerHour;
  const minutesPerMonth = 30 * minutesPerDay;
  const minutesPerYear = 365 * minutesPerDay;

  let remaining = safeMinutes;
  const years = Math.floor(remaining / minutesPerYear);
  remaining %= minutesPerYear;
  const months = Math.floor(remaining / minutesPerMonth);
  remaining %= minutesPerMonth;
  const days = Math.floor(remaining / minutesPerDay);
  remaining %= minutesPerDay;
  const hours = Math.floor(remaining / minutesPerHour);
  const mins = remaining % minutesPerHour;

  const toFaDigits = (value: number): string => {
    const digits = String(value);
    const faDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return digits.replace(/\d/g, (d) => faDigits[Number(d)] ?? d);
  };

  const parts: string[] = [];
  const pushPart = (value: number, faLabel: string, enLabel: string) => {
    if (value <= 0) return;
    if (isFa) {
      parts.push(`${toFaDigits(value)} ${faLabel}`);
      return;
    }
    parts.push(`${value} ${enLabel}${value === 1 ? "" : "s"}`);
  };

  pushPart(years, "سال", "year");
  pushPart(months, "ماه", "month");
  pushPart(days, "روز", "day");
  pushPart(hours, "ساعت", "hour");
  pushPart(mins, "دقیقه", "minute");

  if (parts.length === 0) {
    return isFa ? "۱ روز" : "1 day";
  }

  const joiner = isFa ? " و " : " and ";
  return parts.join(joiner);
}
