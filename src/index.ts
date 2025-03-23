import fs from 'fs';
import { AIProjectsClient, DoneEvent, ErrorEvent, isOutputOfType, MessageStreamEvent, RunStreamEvent, ToolUtility } from '@azure/ai-projects';
import type { AgentOutput, AgentThreadOutput, MessageDeltaChunk, MessageDeltaTextContent, MessageTextContentOutput, ThreadRunOutput } from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';
import readline from 'readline';
import { config } from 'dotenv';
import { PromptConfig } from './types';
config();

const {
    aiFoundryConnectionString = process.env.AI_FOUNDRY_PROJECT_CONNECTION_STRING as string,
    aiSearchConnectionString = process.env.AI_SEARCH_CONNECTION_STRING as string,
    model = process.env.AI_MODEL as string
} = process.env as Record<string, string>;

// Throw an error if the connection string is not set
if (!aiFoundryConnectionString && !aiSearchConnectionString) {
    throw new Error('Please set the AI_FOUNDRY_PROJECT_CONNECTION_STRING and AI_SEARCH_CONNECTION_STRING environment variable.');
}

async function main() {
    const client = AIProjectsClient.fromConnectionString(aiFoundryConnectionString, new DefaultAzureCredential());

    // #### Step 1. Define prompts and tools
    const promptConfig: Record<string, PromptConfig> = {
        solveEquation: {
            prompt: 'I need to solve the equation `3x + 11 = 14`. Can you help me?'
        },
        hotelReviews: {
            prompt: 'Tell me about the hotel reviews in the HotelReviews_data.csv.',
            fileId: '',
            filePath: './files/HotelReviews_data.csv'
        },
        insuranceCoverage: {
            prompt: 'What are my health insurance plan coverage types?',
            aiSearch: true
        }
    };
    const selectedPromptConfig = promptConfig.insuranceCoverage;
    console.log('Prompt:', selectedPromptConfig.prompt);

    // #### Step 2. Create agent tools if needed
    await createTools(selectedPromptConfig, client);

    const agent = await client.agents.createAgent(model, {
        name: 'my-agent',
        instructions: 'You are a helpful agent',
        temperature: 0.5,
        tools: selectedPromptConfig.tools,
        toolResources: selectedPromptConfig.toolResources
    });

    // #### Step 3. a thread
    const thread = await client.agents.createThread();

    // #### Step 4. Add a user message to the thread
    await client.agents.createMessage(thread.id, {
        role: 'user',
        content: selectedPromptConfig.prompt,
    });

    // #### Step 5. Run the agent
    let runId = await runAgent(client, thread, agent);

    // #### Step 6. Print the messages from the agent
    const messages = await client.agents.listMessages(thread.id);
    console.log('\nMessages:\n----------------------------------------------');

    // Messages iterate from oldest to newest - messages[0] is the most recent
    const messagesArray = messages.data;
    for (let i = messagesArray.length - 1; i >= 0; i--) {
        const m = messagesArray[i];
        console.log(`Type: ${m.content[0].type}`);
        if (isOutputOfType<MessageTextContentOutput>(m.content[0], 'text')) {
            const textContent = m.content[0] as MessageTextContentOutput;
            console.log(`Text: ${textContent.text.value}`);
        }
    }

    // #### Step 7. Write out stats and delete the agent once done
    await getRunStats(runId, client, thread);

    // #### Step 8. Clean up
    await dispose(selectedPromptConfig, client, agent);
}

async function createTools(selectedPromptConfig: PromptConfig, client: AIProjectsClient) {
    if (selectedPromptConfig.filePath) {
        const { codeInterpreterTool, file } = await getCodeInterpreter(selectedPromptConfig, client);
        selectedPromptConfig.fileId = file.id;
        selectedPromptConfig.tools = [codeInterpreterTool.definition];
        selectedPromptConfig.toolResources = codeInterpreterTool.resources;
    }

    if (selectedPromptConfig.aiSearch) {
        let azureAISearchTool = await createAISearchTool(client);
        selectedPromptConfig.tools = [azureAISearchTool.definition];
        selectedPromptConfig.toolResources = azureAISearchTool.resources;
    }
}

async function dispose(selectedPromptConfig: PromptConfig, client: AIProjectsClient, agent: AgentOutput) {
    if (selectedPromptConfig.fileId) {
        console.log(`\nDeleting file with ID: ${selectedPromptConfig.fileId}`);
        await client.agents.deleteFile(selectedPromptConfig.fileId);
    }
    console.log(`\nDeleting agent with ID: ${agent.id}`);
    await client.agents.deleteAgent(agent.id);
}

async function getRunStats(runId: string, client: AIProjectsClient, thread: AgentThreadOutput) {
    if (runId) {
        const completedRun = await client.agents.getRun(thread.id, runId);
        console.log('\nToken usage:', completedRun.usage);
    }
}

async function runAgent(client: AIProjectsClient, thread: AgentThreadOutput, agent: AgentOutput) {
    const run = client.agents.createRun(thread.id, agent.id);
    const streamEventMessages = await run.stream();
    let runId = '';

    for await (const eventMessage of streamEventMessages) {
        switch (eventMessage.event) {
            case RunStreamEvent.ThreadRunCreated:
                runId = (eventMessage.data as ThreadRunOutput).id;
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
                console.log('\nThread run completed.');
                break;

            case ErrorEvent.Error:
                console.error('Error:', eventMessage.data);
                break;

            case DoneEvent.Done:
                break;
        }
    }

    return runId;
}

async function getCodeInterpreter(selectedPromptConfig: PromptConfig, client: AIProjectsClient): Promise<{ codeInterpreterTool: any, file: any }> {
    const fileStream = fs.createReadStream(selectedPromptConfig.filePath as string);
    const file = await client.agents.uploadFile(fileStream, 'assistants', { fileName: selectedPromptConfig.filePath });
    console.log(`Uploaded local file, file ID : ${file.id}`);
    const codeInterpreterTool = ToolUtility.createCodeInterpreterTool([file.id]);
    return { codeInterpreterTool, file };
}

async function createAISearchTool(client: AIProjectsClient) {
    const aiSearchConnection = await client.connections.getConnection(aiSearchConnectionString || '');
    let azureAISearchTool = ToolUtility.createAzureAISearchTool(
        aiSearchConnection.id,
        aiSearchConnection.name
    );
    return azureAISearchTool;
}

function promptUser(question: string): Promise<string> {
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

main().catch((err) => {
    console.error('The sample encountered an error:', err);
});
