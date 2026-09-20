export function getMonthPrefix(date = new Date()) {
  const month = date
    .toLocaleString("en-US", { month: "short", timeZone: "Asia/Kolkata" })
    .toUpperCase();
  const year = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "2-digit",
  }).format(date);
  return `${month}${year}`;
}
