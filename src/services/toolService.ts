import fs from 'fs';
import { AIProjectsClient, ToolUtility } from '@azure/ai-projects';
import { aiSearchConnectionString } from '../config/env.js';
import { PromptConfig } from '../types.js';

/**
 * Creates the necessary tools based on the prompt configuration
 */
export async function createTools(selectedPromptConfig: PromptConfig, client: AIProjectsClient) {
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
 * Creates a code interpreter tool
 */
export async function getCodeInterpreter(selectedPromptConfig: PromptConfig, client: AIProjectsClient) {
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
export async function createAISearchTool(client: AIProjectsClient) {
    if (!aiSearchConnectionString) {
        throw new Error('AI Search connection string is required');
    }

    const aiSearchConnection = await client.connections.getConnection(aiSearchConnectionString);
    return ToolUtility.createAzureAISearchTool(
        aiSearchConnection.id,
        aiSearchConnection.name
    );
}