import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAcademicYear(dateInput?: Date | string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 8 = Sept
  if (month >= 8) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}
