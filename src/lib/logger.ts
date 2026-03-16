const isDev = import.meta.env.DEV;

export function logError(message?: string, error?: unknown): void {
  if (isDev) {
    if (message !== undefined && error !== undefined) {
      console.error(message, error);
    } else if (message !== undefined) {
      console.error(message);
    } else if (error !== undefined) {
      console.error(error);
    }
  }
}

export function logWarn(message?: string): void {
  if (isDev && message !== undefined) {
    console.warn(message);
  }
}
