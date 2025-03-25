import readline from 'readline';
import { PromptConfig } from '../types.js';
import { formatKeyToTitleCase } from './formatting.js';

/**
 * Displays all available prompts
 */
export function displayAvailablePrompts(promptConfig: Record<string, PromptConfig>) {
    console.log('\nAvailable prompts:');
    console.log('------------------');
    const promptKeys = Object.keys(promptConfig);
    promptKeys.forEach((key, index) => {
        const formattedKey = formatKeyToTitleCase(key);
        const emoji = promptConfig[key].emoji || '📝'; // Default emoji if none is specified
        console.log(`${index + 1}. ${emoji} ${formattedKey}: ${promptConfig[key].prompt}`);
    });
    console.log(`${promptKeys.length + 1}. 👋 Exit`);
}

/**
 * Gets user selection and returns the index
 */
export async function getPromptSelection(): Promise<number> {
    const selection = await promptUser('\nSelect a prompt by number: ');
    return parseInt(selection) - 1;
}

/**
 * Prompts the user for input
 */
export function promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}