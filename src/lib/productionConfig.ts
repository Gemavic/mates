export const isProduction = import.meta.env.PROD;
export const isDevelopment = import.meta.env.DEV;

export const log = {
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },
};

export const FEATURES = {
  ENABLE_ANALYTICS: isProduction,
  ENABLE_ERROR_REPORTING: isProduction,
  ENABLE_DEBUG_TOOLS: isDevelopment,
  ENABLE_CONSOLE_LOGS: isDevelopment,
};

export const API_CONFIG = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  CACHE_TTL: 300000,
};

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_MESSAGE_LENGTH: 5000,
};
