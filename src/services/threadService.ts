import fs from 'fs';
import { AIProjectsClient, AgentThreadOutput, DoneEvent, ErrorEvent, MessageStreamEvent, RunStreamEvent, isOutputOfType } from '@azure/ai-projects';
import type { AgentOutput, MessageDeltaChunk, MessageDeltaTextContent, MessageImageFileContentOutput, MessageTextContentOutput, OpenAIPageableListOfThreadMessageOutput, ThreadRunOutput } from '@azure/ai-projects';
import { PromptConfig } from '../types.js';

export async function addMessageToThread(client: AIProjectsClient, threadId: string, message: string) {
    await client.agents.createMessage(threadId, {
        role: 'user',
        content: message,
    });
}

export async function printThreadMessages(selectedPromptConfig: PromptConfig, client: AIProjectsClient, threadId: string) {
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

export async function getImages(client: AIProjectsClient, messages: OpenAIPageableListOfThreadMessageOutput) {
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
                    
                    // Ensure downloads directory exists
                    if (!fs.existsSync('./downloads')) {
                        fs.mkdirSync('./downloads', { recursive: true });
                    }
                    
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

export async function getRunStats(runId: string, client: AIProjectsClient, thread: AgentThreadOutput) {
    if (runId) {
        const completedRun = await client.agents.getRun(thread.id, runId);
        console.log('\nToken usage:', completedRun.usage);
    }
}

export async function runAgent(client: AIProjectsClient, thread: AgentThreadOutput, agent: AgentOutput): Promise<string> {
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