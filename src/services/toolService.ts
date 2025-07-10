import fs from "fs";
import { cpus } from "os";
import { AIProjectClient } from '@azure/ai-projects';
import { connectionToolType, FunctionToolDefinition, RequiredFunctionToolCall, ToolOutput, ToolUtility } from "@azure/ai-agents";
import { aiSearchConnectionId, bingGroundingConnectionId } from "../config/env.js";
import { PromptConfig } from "../types.js";

export async function createTools(
  selectedPromptConfig: PromptConfig,
  client: AIProjectClient
) {
  if (selectedPromptConfig.tool === "code-interpreter") {
    const { codeInterpreterTool, file } = await getCodeInterpreter(selectedPromptConfig, client);
    if (file) {
      selectedPromptConfig.fileId = file?.id;
    }
    selectedPromptConfig.tools = [codeInterpreterTool.definition];
    selectedPromptConfig.toolResources = codeInterpreterTool.resources;
  }

  if (selectedPromptConfig.tool === "ai-search") {
    const azureAISearchTool = await createAISearchTool();
    selectedPromptConfig.tools = [azureAISearchTool.definition];
    selectedPromptConfig.toolResources = azureAISearchTool.resources;
  }

  if (selectedPromptConfig.tool === "function-tool") {
    selectedPromptConfig.executor = FunctionToolExecutor;
    selectedPromptConfig.tools = [
      ...FunctionToolExecutor.getFunctionDefinitions(),
    ];
    selectedPromptConfig.toolResources = {};
  }

  if (selectedPromptConfig.tool === "bing-grounding") {
    const bingTool = await createBingGroundingTool();
    selectedPromptConfig.tools = [bingTool.definition];
  }
}

export async function getCodeInterpreter(selectedPromptConfig: PromptConfig, client: AIProjectClient) {
  if (selectedPromptConfig.filePath) {
    const fileStream = fs.createReadStream(selectedPromptConfig.filePath);
    const file = await client.agents.files.upload(fileStream, "assistants", {
      fileName: selectedPromptConfig.filePath,
    });
    console.log(
      `Uploaded ${selectedPromptConfig.filePath}. File ID: ${file.id}`
    );
    const codeInterpreterTool = ToolUtility.createCodeInterpreterTool([
      file.id,
    ]);
    return { codeInterpreterTool, file };
  }
  return {
    codeInterpreterTool: ToolUtility.createCodeInterpreterTool([]),
    file: null,
  };
}

export async function createAISearchTool() {
  return ToolUtility.createAzureAISearchTool(aiSearchConnectionId, "AI Search Connection"); // Using a default name since we can't fetch it
}

async function createBingGroundingTool() {
  return ToolUtility.createConnectionTool(connectionToolType.BingGrounding, [
    bingGroundingConnectionId,
  ]);
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
          name: "getCpuUsage",
          description: "Gets the current CPU usage of the system.",
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
