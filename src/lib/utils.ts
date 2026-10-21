import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

/** Merge class names with tailwind-merge */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format date to relative time (e.g., "2 days ago") */
export function formatRelativeDate(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true });
}

/** Format a rupee amount (stored as Decimal in the DB). */
export function formatCurrency(amount: number | string | { toString(): string }) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount.toString()));
}

/** Generate a random ID (for temporary client-side IDs) */
export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

/** Debounce a function */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/** Truncate text with ellipsis */
export function truncate(text: string, length: number) {
  return text.length > length ? `${text.substring(0, length)}...` : text;
}

/** Convert file size to human-readable format */
export function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/** Format date for input fields (YYYY-MM-DDTHH:MM) */
export function formatDateForInput(date: Date) {
  const pad = (num: number) => num.toString().padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}
