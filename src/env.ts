import { config } from 'dotenv';
config();

export const aiFoundryConnectionString = process.env.AI_FOUNDRY_PROJECT_CONNECTION_STRING || '';
export const aiSearchConnectionString = process.env.AI_SEARCH_CONNECTION_STRING || '';
export const model = process.env.AI_MODEL || '';

/**
 * Validates that all required environment variables are set
 * @throws Error if any required environment variable is missing
 */
export function validateEnvironment(): void {
    if (!aiFoundryConnectionString) {
        throw new Error('Please set the AI_FOUNDRY_PROJECT_CONNECTION_STRING environment variable.');
    }

    if (!aiSearchConnectionString) {
        throw new Error('Please set the AI_SEARCH_CONNECTION_STRING environment variable.');
    }

    if (!model) {
        throw new Error('Please set the AI_MODEL environment variable.');
    }
}

// Validate environment variables when the module is imported
validateEnvironment();