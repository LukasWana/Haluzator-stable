/**
 * Logger utility that conditionally logs based on environment
 * In production, only errors are logged
 */

const isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';

export const logger = {
    log: (...args: unknown[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    error: (...args: unknown[]) => {
        // Always log errors, even in production
        console.error(...args);
    },

    warn: (...args: unknown[]) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },

    info: (...args: unknown[]) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },

    debug: (...args: unknown[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    }
};

