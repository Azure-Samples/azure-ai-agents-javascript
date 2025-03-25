import fs from 'fs';
import { AIProjectsClient, ToolUtility } from '@azure/ai-projects';
import { aiSearchConnectionString } from '../config/env.js';
import { PromptConfig } from '../types.js';

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