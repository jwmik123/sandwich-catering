import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string and return a Date object in local timezone
 * This prevents off-by-one day errors caused by timezone conversions
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD or DD-MM-YYYY format
 * @returns {Date} Date object in local timezone
 */
export function parseDateString(dateStr) {
  if (!dateStr) return new Date();

  // Check if date is in DD-MM-YYYY format (day first)
  if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const [day, month, year] = dateStr.split('-');
    // Create date in local timezone to avoid day shifts
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  // Check if date is in YYYY-MM-DD format (ISO format)
  else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-');
    // Create date in local timezone to avoid day shifts
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  // Try to parse as-is (fallback)
  else {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
}
