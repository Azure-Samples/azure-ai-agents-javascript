import { AgentsClient, Agent } from '@azure/ai-agents';
import { model } from '../config/env.js';
import { promptConfig } from '../config/promptConfig.js';
import { PromptConfig } from '../types.js';
import { createTools } from './toolService.js';
import { addMessageToThread, getRunStats, printThreadMessages, runAgent } from './threadService.js';
import { formatKeyToTitleCase } from '../utils/formatting.js';

export async function processSelectedPrompt(client: AgentsClient, selectedKey: string) {
    const selectedPromptConfig = promptConfig[selectedKey];
    const emoji = selectedPromptConfig.emoji || '📝';
    console.log(`\nSelected: ${emoji} ${formatKeyToTitleCase(selectedKey)}`);
    console.log('Tools: ' + (selectedPromptConfig.tool ? selectedPromptConfig.tool : 'None'));
    console.log('Prompt: ' + selectedPromptConfig.prompt);


    try {
        await createTools(selectedPromptConfig, client);

        const agent = await client.createAgent(model, {
            name: `agent-${selectedKey}`,
            instructions: selectedPromptConfig.instructions || `You are a helpful agent that can assist with ${selectedKey}.`,
            temperature: 0.5,
            tools: selectedPromptConfig.tools,
            toolResources: selectedPromptConfig.toolResources,
            requestOptions: {
                headers: { "x-ms-enable-preview": "true" },
            },
        });

        const thread = await client.threads.create();
        await addMessageToThread(client, thread.id, selectedPromptConfig.prompt);

        const runId = await runAgent(client, thread, agent, selectedPromptConfig);
        await printThreadMessages(selectedPromptConfig, client, thread.id);
        await getRunStats(runId, client, thread);

        await dispose(selectedPromptConfig, client, agent);
    } catch (error) {
        console.error(`Error processing prompt "${selectedKey}":`, error);
    }
}

/**
 * Cleans up resources created during the prompt execution
 */
export async function dispose(selectedPromptConfig: PromptConfig, client: AgentsClient, agent: Agent) {
    if (selectedPromptConfig.fileId) {
        console.log(`\nDeleting file with ID: ${selectedPromptConfig.fileId}`);
        await client.files.delete(selectedPromptConfig.fileId);
    }
    console.log(`\nDeleting agent with ID: ${agent.id}`);
    await client.deleteAgent(agent.id);
}