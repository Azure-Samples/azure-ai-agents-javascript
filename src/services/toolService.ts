import fs from 'fs';
import { cpus } from 'os';
import { AIProjectClient } from '@azure/ai-projects';
import { connectionToolType, FunctionToolDefinition, RequiredFunctionToolCall, ToolOutput, ToolUtility } from '@azure/ai-agents';
import { aiSearchConnectionId, aiSearchIndexName, bingGroundingConnectionId } from '../config/env.js';
import { PromptConfig } from '../types.js';

export async function createTools(selectedPromptConfig: PromptConfig, client: AIProjectClient) {
  switch (selectedPromptConfig.tool) {
    case 'code-interpreter': {
      const { codeInterpreterTool, file } = await getCodeInterpreter(selectedPromptConfig, client);
      if (file) {
        selectedPromptConfig.fileId = file.id;
      }
      selectedPromptConfig.tools = [codeInterpreterTool.definition];
      selectedPromptConfig.toolResources = codeInterpreterTool.resources;
      break;
    }

    case 'ai-search': {
      const azureAISearchTool = ToolUtility.createAzureAISearchTool(aiSearchConnectionId, aiSearchIndexName);
      selectedPromptConfig.tools = [azureAISearchTool.definition];
      selectedPromptConfig.toolResources = azureAISearchTool.resources;
      break;
    }

    case 'function-tool': {
      selectedPromptConfig.executor = FunctionToolExecutor;
      selectedPromptConfig.tools = [...FunctionToolExecutor.getFunctionDefinitions()];
      selectedPromptConfig.toolResources = {};
      break;
    }

    case 'bing-grounding': {
      // Create Bing grounding tool with proper search configuration
      const bingTool = ToolUtility.createBingGroundingTool([{
        connectionId: bingGroundingConnectionId
      }]);
      selectedPromptConfig.tools = [bingTool.definition];
      break;
    }

    default:
      // No tool configured or unknown tool type
      break;
  }
}

export async function getCodeInterpreter(selectedPromptConfig: PromptConfig, client: AIProjectClient) {
  if (selectedPromptConfig.filePath) {
    const fileStream = fs.createReadStream(selectedPromptConfig.filePath);
    const file = await client.agents.files.upload(fileStream, 'assistants', {
      fileName: selectedPromptConfig.filePath,
    });
    console.log(`Uploaded ${selectedPromptConfig.filePath}. File ID: ${file.id}`);
    const codeInterpreterTool = ToolUtility.createCodeInterpreterTool([file.id]);
    return { codeInterpreterTool, file };
  }
  return {
    codeInterpreterTool: ToolUtility.createCodeInterpreterTool([]),
    file: null,
  };
}

class FunctionToolFactory {
  static getCpuUsage() {
    return `CPU Usage: ${cpus()[0].model} ${Math.floor(cpus().reduce((acc, core) => acc + core.speed, 0) / 1000)}%`;
  }
}

export class FunctionToolExecutor {
  static functionTools: {
    func: Function;
    definition: FunctionToolDefinition;
  }[] = [
    {
      func: FunctionToolFactory.getCpuUsage,
        ...ToolUtility.createFunctionTool({
          name: 'getCpuUsage',
          description: 'Gets the current CPU usage of the system.',
          parameters: {},
      }),
    },
  ];

  public static invokeTool(toolCall: RequiredFunctionToolCall): ToolOutput | undefined {
    console.log(`💡 Function tool ${toolCall.id} - ${toolCall.function.name}`);
    const args: string[] = [];
    if (toolCall.function.arguments) {
      try {
        const params = JSON.parse(toolCall.function.arguments) as Record<string, string>;
        for (const key in params) {
          if (Object.prototype.hasOwnProperty.call(params, key)) {
            args.push(params[key] as string);
          }
        }
      } catch (error) {
        console.error(`Failed to parse parameters: ${toolCall.function.arguments}`, error);
        return undefined;
      }
    }
    const result = this.functionTools.find((tool) => tool.definition.function.name === toolCall.function.name)?.func(...args);

    console.log(`💡 Function tool ${toolCall.id} - completed`);

    return result
      ? {
          toolCallId: toolCall.id,
          output: JSON.stringify(result),
        }
      : undefined;
  }

  public static getFunctionDefinitions(): FunctionToolDefinition[] {
    return FunctionToolExecutor.functionTools.map((tool) => {
      return tool.definition;
    });
  }
}
