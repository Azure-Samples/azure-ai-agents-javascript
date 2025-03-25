import fs from 'fs';
import readline from 'readline';
import { AIProjectsClient, DoneEvent, ErrorEvent, isOutputOfType, MessageStreamEvent, RunStreamEvent, ToolUtility } from '@azure/ai-projects';
import type { AgentOutput, AgentThreadOutput, MessageDeltaChunk, MessageDeltaTextContent, MessageImageFileContentOutput, MessageTextContentOutput, OpenAIPageableListOfThreadMessageOutput, ThreadRunOutput } from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';
import { aiFoundryConnectionString, aiSearchConnectionString, model } from './env.js';
import { promptConfig } from './promptConfig.js';
import { PromptConfig } from './types.js';

/**
 * Main application function
 */
async function main() {
    try {
        const client = AIProjectsClient.fromConnectionString(
            aiFoundryConnectionString,
            new DefaultAzureCredential()
        );

        let continueLoop = true;

        while (continueLoop) {
            displayAvailablePrompts();
    
            const selectedIndex = await getPromptSelection();
            const promptKeys = Object.keys(promptConfig);
    
            // Check if user wants to exit
            if (selectedIndex === promptKeys.length) {
                console.log('Exiting application.');
                continueLoop = false;
                continue;
            }
    
            // Validate selection
            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= promptKeys.length) {
                console.error('Invalid selection. Please enter a number between 1 and ' + (promptKeys.length + 1));
                continue;
            }
    
            await processSelectedPrompt(client, promptKeys[selectedIndex]);
        }
    } catch (err) {
        console.error('The application encountered an error:', err);
        // process.exit(1);
    }
}

/**
 * Displays all available prompts
 */
function displayAvailablePrompts() {
    console.log('\nAvailable prompts:');
    console.log('------------------');
    const promptKeys = Object.keys(promptConfig);
    promptKeys.forEach((key, index) => {
        // Format key by splitting camelCase and converting to title case
        const formattedKey = formatKeyToTitleCase(key);
        const emoji = promptConfig[key].emoji || '📝'; // Default emoji if none is specified
        console.log(`${index + 1}. ${emoji} ${formattedKey}: ${promptConfig[key].prompt}`);
    });
    console.log(`${promptKeys.length + 1}. 👋 Exit`);
}

/**
 * Gets user selection and returns the index
 */
async function getPromptSelection(): Promise<number> {
    const selection = await promptUser('\nSelect a prompt by number: ');
    return parseInt(selection) - 1;
}

/**
 * Processes the selected prompt
 */
async function processSelectedPrompt(client: AIProjectsClient, selectedKey: string) {
    const selectedPromptConfig = promptConfig[selectedKey];
    const emoji = selectedPromptConfig.emoji || '📝';
    console.log(`\nSelected: ${emoji} ${formatKeyToTitleCase(selectedKey)}`);
    console.log('Prompt: ' + selectedPromptConfig.prompt);


    try {
        // Create tools if needed
        await createTools(selectedPromptConfig, client);

        // Create agent
        const agent = await client.agents.createAgent(model, {
            name: 'my-agent',
            instructions: 'You are a helpful agent',
            temperature: 0.5,
            tools: selectedPromptConfig.tools,
            toolResources: selectedPromptConfig.toolResources
        });

        // Create thread and process
        const thread = await client.agents.createThread();
        await addMessageToThread(client, thread.id, selectedPromptConfig.prompt);

        // Run agent and get results
        const runId = await runAgent(client, thread, agent);
        await printThreadMessages(selectedPromptConfig, client, thread.id);
        await getRunStats(runId, client, thread);

        // Clean up resources
        await dispose(selectedPromptConfig, client, agent);
    } catch (error) {
        console.error(`Error processing prompt "${selectedKey}":`, error);
    }
}

/**
 * Adds a message to the specified thread
 */
async function addMessageToThread(client: AIProjectsClient, threadId: string, message: string) {
    await client.agents.createMessage(threadId, {
        role: 'user',
        content: message,
    });
}

/**
 * Creates the necessary tools based on the prompt configuration
 */
async function createTools(selectedPromptConfig: PromptConfig, client: AIProjectsClient) {
    if (selectedPromptConfig.tool === 'code-interpreter') {
        const { codeInterpreterTool, file } = await getCodeInterpreter(selectedPromptConfig, client);
        if (file) {
            selectedPromptConfig.fileId = file?.id;
        }
        selectedPromptConfig.tools = [codeInterpreterTool.definition];
        selectedPromptConfig.toolResources = codeInterpreterTool.resources;
    }

    if (selectedPromptConfig.aiSearch) {
        const azureAISearchTool = await createAISearchTool(client);
        selectedPromptConfig.tools = [azureAISearchTool.definition];
        selectedPromptConfig.toolResources = azureAISearchTool.resources;
    }
}

/**
 * Prints all messages from a thread
 */
async function printThreadMessages(selectedPromptConfig: PromptConfig, client: AIProjectsClient, threadId: string) {
    const messages = await client.agents.listMessages(threadId);
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

    if (selectedPromptConfig.tool === 'code-interpreter' && selectedPromptConfig.filePath) {
        await getImages(client, messages);
    }
}

async function getImages(client: AIProjectsClient, messages: OpenAIPageableListOfThreadMessageOutput) {
    console.log('Looking for image files...');
    const fileIds: string[] = [];
    for (const data of messages.data) {
        for (const content of data.content) {
            const imageFile = (content as MessageImageFileContentOutput).imageFile;
            if (imageFile) {
                fileIds.push(imageFile.fileId);
                const imageFileName = (await client.agents.getFile(imageFile.fileId)).filename;

                const fileContent = await (await client.agents.getFileContent(imageFile.fileId).asNodeStream()).body;
                if (fileContent) {
                    const chunks: Buffer[] = [];
                    for await (const chunk of fileContent) {
                        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                    }
                    const buffer = Buffer.concat(chunks);
                    fs.writeFileSync(`./downloads/${imageFileName}`, buffer);
                }
                else {
                    console.error("Failed to retrieve file content: fileContent is undefined");
                }
                console.log(`Saved image file to: ${imageFileName}`);
            }
        }
    }

    //Delete remote files
    for (const fileId of fileIds) {
        console.log(`Deleting remote image file with ID: ${fileId}`);
        await client.agents.deleteFile(fileId);
    }
}

/**
 * Cleans up resources created during the prompt execution
 */
async function dispose(selectedPromptConfig: PromptConfig, client: AIProjectsClient, agent: AgentOutput) {
    if (selectedPromptConfig.fileId) {
        console.log(`\nDeleting file with ID: ${selectedPromptConfig.fileId}`);
        await client.agents.deleteFile(selectedPromptConfig.fileId);
    }
    console.log(`\nDeleting agent with ID: ${agent.id}`);
    await client.agents.deleteAgent(agent.id);
}

/**
 * Gets run statistics
 */
async function getRunStats(runId: string, client: AIProjectsClient, thread: AgentThreadOutput) {
    if (runId) {
        const completedRun = await client.agents.getRun(thread.id, runId);
        console.log('\nToken usage:', completedRun.usage);
    }
}

/**
 * Runs the agent and processes the stream of events
 */
async function runAgent(client: AIProjectsClient, thread: AgentThreadOutput, agent: AgentOutput): Promise<string> {
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
                    messageDelta.delta.content.forEach(async (contentPart) => {
                        if (contentPart.type === 'text') {
                            const textContent = contentPart as MessageDeltaTextContent;
                            const textValue = textContent.text?.value || '';
                            process.stdout.write(textValue);
                        }
                        if (contentPart.type === 'image_file') {
                            process.stdout.write(`\nReceived image file\n`);
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
                // Nothing to do here
                break;
        }
    }

    return runId;
}

/**
 * Creates a code interpreter tool
 */
async function getCodeInterpreter(selectedPromptConfig: PromptConfig, client: AIProjectsClient) {
    if (selectedPromptConfig.filePath) {
        const fileStream = fs.createReadStream(selectedPromptConfig.filePath);
        const file = await client.agents.uploadFile(fileStream, 'assistants', { fileName: selectedPromptConfig.filePath });
        console.log(`Uploaded ${selectedPromptConfig.filePath}. File ID: ${file.id}`);
        const codeInterpreterTool = ToolUtility.createCodeInterpreterTool([file.id]);
        return { codeInterpreterTool, file };
    }
    return { codeInterpreterTool: ToolUtility.createCodeInterpreterTool([]), file: null };

}

/**
 * Creates an AI Search tool
 */
async function createAISearchTool(client: AIProjectsClient) {
    if (!aiSearchConnectionString) {
        throw new Error('AI Search connection string is required');
    }

    const aiSearchConnection = await client.connections.getConnection(aiSearchConnectionString);
    return ToolUtility.createAzureAISearchTool(
        aiSearchConnection.id,
        aiSearchConnection.name
    );
}

/**
 * Prompts the user for input
 */
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

/**
 * Formats a camelCase key to Title Case with spaces
 * e.g. "solveEquation" becomes "Solve Equation"
 */
function formatKeyToTitleCase(key: string): string {
    // First, add spaces before capital letters and make the entire string lowercase
    const withSpaces = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();

    // Then capitalize the first letter of each word
    return withSpaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Start the application
main().catch((err) => {
    console.error('The sample encountered an error:', err);
    process.exit(1);
});