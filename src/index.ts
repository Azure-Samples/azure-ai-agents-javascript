import {
    AIProjectsClient,
    DoneEvent,
    ErrorEvent,
    isOutputOfType,
    MessageStreamEvent,
    RunStreamEvent,
    ToolUtility
} from '@azure/ai-projects';
import type {
    MessageDeltaChunk,
    MessageDeltaTextContent,
    MessageTextContentOutput
} from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';
import dotenv from 'dotenv';

dotenv.config();

// Set the connection string from the environment variable
const aiFoundryConnectionString = process.env.AI_FOUNDRY_PROJECT_CONNECTION_STRING;
const aiSearchConnectionString = process.env.AI_SEARCH_CONNECTION_STRING;
const model = 'gpt-4o';

// Throw an error if the connection string is not set
if (!aiFoundryConnectionString && !aiSearchConnectionString) {
    throw new Error('Please set the AI_FOUNDRY_PROJECT_CONNECTION_STRING and AI_SEARCH_CONNECTION_STRING environment variable.');
}

export async function main() {
    const client = AIProjectsClient.fromConnectionString(aiFoundryConnectionString || '',  new DefaultAzureCredential());

    // Step 1 - Add tools
    const codeInterpreterTool = ToolUtility.createCodeInterpreterTool([]);;
    const aiSearchConnection = await client.connections.getConnection(aiSearchConnectionString || '');

    const azureAISearchTool = ToolUtility.createAzureAISearchTool(
        aiSearchConnection.id,
        aiSearchConnection.name,
    );

    // Step 2 Create an agent
    // A few prompts to try
    const prompts = [
        'I need to solve the equation `3x + 11 = 14`. Can you help me?',
        'What are my health insurance plan coverage types?',
    ];
    const prompt = prompts[0];
    console.log('Prompt:', prompt);

    const agent = await client.agents.createAgent(model, {
        name: 'my-agent',
        instructions: 'You are a helpful agent',
        temperature: 0.5,
        tools: [azureAISearchTool.definition],
        toolResources: azureAISearchTool.resources,
    });

    // Step 3 a thread
    const thread = await client.agents.createThread();

    // Step 4 Add a user message to the thread
    await client.agents.createMessage(thread.id, {
        role: 'user',
        content: prompt,
    });

    // Step 5 Run the agent
    const run = client.agents.createRun(thread.id, agent.id);
    const streamEventMessages = await run.stream();
    let runId = '';

    for await (const eventMessage of streamEventMessages) {
        switch (eventMessage.event) {
            case RunStreamEvent.ThreadRunCreated:
                break;
            case MessageStreamEvent.ThreadMessageDelta:
                {
                    const messageDelta = eventMessage.data as MessageDeltaChunk;
                    messageDelta.delta.content.forEach((contentPart) => {
                        if (contentPart.type === 'text') {
                            const textContent = contentPart as MessageDeltaTextContent;
                            const textValue = textContent.text?.value || 'No text';
                            process.stdout.write(textValue);
                        }
                    });
                }
                break;

            case RunStreamEvent.ThreadRunCompleted:
                console.log('Thread run completed');
                runId = (eventMessage.data as { id: string }).id;
                break;
            case ErrorEvent.Error:
                console.log(`An error occurred. Data ${eventMessage.data}`);
                break;
            case DoneEvent.Done:
                break;
        }
    }

    // 6. Print the messages from the agent
    const messages = await client.agents.listMessages(thread.id);
    console.log('\nMessages:\n----------------------------------------------');

    // Messages iterate from oldest to newest
    // messages[0] is the most recent
    const messagesArray = messages.data;
    for (let i = messagesArray.length - 1; i >= 0; i--) {
        const m = messagesArray[i];
        console.log(`Type: ${m.content[0].type}`);
        if (isOutputOfType<MessageTextContentOutput>(m.content[0], 'text')) {
            const textContent = m.content[0] as MessageTextContentOutput;
            console.log(`Text: ${textContent.text.value}`);
        }
    }

    // 7. Write out stats and delete the agent once done
    if (runId) {
        const completedRun = await client.agents.getRun(thread.id, runId);
        console.log('Token usage:', completedRun.usage);
    }

    await client.agents.deleteAgent(agent.id);
}

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});