import { config } from 'dotenv';
config();

export const aiFoundryConnectionString = process.env.AI_FOUNDRY_PROJECT_CONNECTION_STRING || '';
export const aiSearchConnectionId = process.env.AI_SEARCH_CONNECTION_ID || '';
export const bingGroundingConnectionId = process.env.BING_GROUNDING_CONNECTION_ID || '';
export const model = process.env.AI_MODEL || '';

validateEnvironment();

function validateEnvironment(): void {
    if (!aiFoundryConnectionString) {
        throw new Error('Please set the AI_FOUNDRY_PROJECT_CONNECTION_STRING environment variable.');
    }

    if (!aiSearchConnectionId) {
        console.warn('AI_SEARCH_CONNECTION_ID is not set. AI Search features will not work.');
    }

    if (!model) {
        throw new Error('Please set the AI_MODEL environment variable.');
    }

    if (!bingGroundingConnectionId) {
        throw new Error('Please set the BING_GROUNDING_CONNECTION_ID environment variable.');
    }
}