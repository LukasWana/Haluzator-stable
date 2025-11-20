/**
 * Validates environment variables on application startup
 */

export const validateEnvironment = (): void => {
    const isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';

    // Check for required environment variables
    // Currently, all environment variables are optional
    // But we can add validation here if needed

    if (isDevelopment) {
        // In development, warn if GEMINI_API_KEY is missing (if needed)
        // This is optional functionality, so we don't throw errors
        const geminiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            console.warn('⚠️  GEMINI_API_KEY not set. Some features may not work.');
        }
    }

    // In production, ensure API keys are not exposed
    if (!isDevelopment) {
        const geminiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (geminiKey) {
            console.warn('⚠️  WARNING: GEMINI_API_KEY detected in production. This should be handled server-side.');
        }
    }
};

