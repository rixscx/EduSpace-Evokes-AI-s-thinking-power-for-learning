
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNowStrict, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: Date): string {
  try {
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch (error) {
    // Fallback if date is invalid, though ideally dates should always be valid
    console.error("Error formatting relative time:", error);
    return format(new Date(), "PPpp"); // Or some other sensible default
  }
}
