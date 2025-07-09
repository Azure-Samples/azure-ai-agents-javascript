import { config } from 'dotenv';
config();

export const aiFoundryProjectEndpoint = process.env.AI_FOUNDRY_PROJECT_ENDPOINT || '';
export const aiSearchConnectionId = process.env.AI_SEARCH_CONNECTION_ID || '';
export const bingGroundingConnectionId = process.env.BING_GROUNDING_CONNECTION_ID || '';
export const model = process.env.AI_MODEL || '';

validateEnvironment();

function validateEnvironment(): void {
    if (!aiFoundryProjectEndpoint) {
        throw new Error('AI_FOUNDRY_PROJECT_ENDPOINT is required.');
    }

    if (!aiSearchConnectionId) {
        console.warn('AI_SEARCH_CONNECTION_ID is not set. AI Search features will not work.');
    }

    if (!bingGroundingConnectionId) {
        console.warn('BING_GROUNDING_CONNECTION_ID is not set. Bing Grounding features will not work.');
    }

    if (!model) {
        throw new Error('AI_MODEL is required.');
    }
}