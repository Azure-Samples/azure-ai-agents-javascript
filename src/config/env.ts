import { config } from 'dotenv';
config();

export const aiFoundryConnectionString = process.env.AI_FOUNDRY_PROJECT_CONNECTION_STRING || '';
export const aiSearchConnectionString = process.env.AI_SEARCH_CONNECTION_STRING || '';
export const model = process.env.AI_MODEL || '';

validateEnvironment();

function validateEnvironment(): void {
    if (!aiFoundryConnectionString) {
        throw new Error('Please set the AI_FOUNDRY_PROJECT_CONNECTION_STRING environment variable.');
    }

    if (!aiSearchConnectionString) {
        console.warn('AI_SEARCH_CONNECTION_STRING is not set. AI Search features will not work.');
    }

    if (!model) {
        throw new Error('Please set the AI_MODEL environment variable.');
    }
}