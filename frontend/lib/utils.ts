/** Convert a job title to a URL-safe slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Format a salary number as a human-readable string, e.g. £45,000 or £45k. */
export function formatSalary(amount: number, compact = false): string {
  if (compact) {
    return amount >= 1000
      ? `£${Math.round(amount / 1000)}k`
      : `£${amount.toLocaleString('en-GB')}`;
  }
  return `£${amount.toLocaleString('en-GB')}`;
}

/** Format a salary range, e.g. "£40k – £60k" or "£40,000 – £60,000". */
export function formatSalaryRange(min: number, max: number, compact = false): string {
  return `${formatSalary(min, compact)} – ${formatSalary(max, compact)}`;
}

/** Format a date string (DD/MM/YYYY from Reed) to a readable format. */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // Reed returns dates as "01/01/2024"
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return dateStr;
}
