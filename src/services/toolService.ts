import fs from "fs";
import { cpus } from "os";
import {
  AIProjectsClient,
  connectionToolType,
  FunctionToolDefinition,
  FunctionToolDefinitionOutput,
  RequiredToolCallOutput,
  ToolOutput,
  ToolUtility,
} from "@azure/ai-projects";
import {
  aiSearchConnectionId,
  bingGroundingConnectionId,
} from "../config/env.js";
import { PromptConfig } from "../types.js";

export async function createTools(
  selectedPromptConfig: PromptConfig,
  client: AIProjectsClient
) {
  if (selectedPromptConfig.tool === "code-interpreter") {
    const { codeInterpreterTool, file } = await getCodeInterpreter(
      selectedPromptConfig,
      client
    );
    if (file) {
      selectedPromptConfig.fileId = file?.id;
    }
    selectedPromptConfig.tools = [codeInterpreterTool.definition];
    selectedPromptConfig.toolResources = codeInterpreterTool.resources;
  }

  if (selectedPromptConfig.tool === "ai-search") {
    const azureAISearchTool = await createAISearchTool(client);
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
    const bingTool = await createBingGroundingTool(client);
    selectedPromptConfig.tools = [bingTool.definition];
  }
}

export async function getCodeInterpreter(
  selectedPromptConfig: PromptConfig,
  client: AIProjectsClient
) {
  if (selectedPromptConfig.filePath) {
    const fileStream = fs.createReadStream(selectedPromptConfig.filePath);
    const file = await client.agents.uploadFile(fileStream, "assistants", {
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

export async function createAISearchTool(client: AIProjectsClient) {
  const aiSearchConnection = await client.connections.getConnection(
    aiSearchConnectionId
  );
  return ToolUtility.createAzureAISearchTool(
    aiSearchConnection.id,
    aiSearchConnection.name
  );
}

async function createBingGroundingTool(client: AIProjectsClient) {
  const bingConnection = await client.connections.getConnection(
    bingGroundingConnectionId
  );
  const connectionId = bingConnection.id;
  return ToolUtility.createConnectionTool(connectionToolType.BingGrounding, [
    connectionId,
  ]);
}

class FunctionToolFactory {
  static getCpuUsage() {
    return `CPU Usage: ${cpus()[0].model} ${Math.floor(
      cpus().reduce((acc, core) => acc + core.speed, 0) / 1000
    )}%`;
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

  public static invokeTool(
    toolCall: RequiredToolCallOutput & FunctionToolDefinitionOutput
  ): ToolOutput | undefined {
    console.log(`💡 Function tool ${toolCall.id} - ${toolCall.function.name}`);
    const args: string[] = [];
    if (toolCall.function.parameters) {
      try {
        const params = JSON.parse(toolCall.function.parameters) as Record<
          string,
          string
        >;
        for (const key in params) {
          if (Object.prototype.hasOwnProperty.call(params, key)) {
            args.push(params[key] as string);
          }
        }
      } catch (error) {
        console.error(
          `Failed to parse parameters: ${toolCall.function.parameters}`,
          error
        );
        return undefined;
      }
    }
    const result = this.functionTools
      .find((tool) => tool.definition.function.name === toolCall.function.name)
      ?.func(...args);

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
