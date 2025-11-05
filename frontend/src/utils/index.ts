export const clsx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const formatTime = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

// Re-export digit.js functions from global scope
// These are loaded from https://hnasheralneam.github.io/digit/main.js
declare global {
  interface Window {
    formatDate: (date: Date, format?: string) => string;
    formatTime: (date: Date, format?: string) => string;
  }
}

export const formatDate = (date: Date, format?: string): string => {
  if (typeof window !== 'undefined' && window.formatDate) {
    return window.formatDate(date, format);
  }
  // Fallback if digit.js not loaded
  return date.toLocaleDateString();
};

export const formatTimeFromDate = (date: Date, format?: string): string => {
  if (typeof window !== 'undefined' && window.formatTime) {
    return window.formatTime(date, format);
  }
  // Fallback if digit.js not loaded
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
