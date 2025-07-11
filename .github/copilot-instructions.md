# Azure AI Agents JavaScript Demo - Copilot Instructions

## Project Architecture

This is an Azure AI Agents demo showcasing different tooling capabilities through a console-based interface. The architecture follows a service-oriented pattern:

- **Entry Point**: `src/index.ts` - Interactive console loop for demo selection
- **Core Services**: `src/services/` - Business logic for agents, tools, and threads
- **Configuration**: `src/config/` - Environment variables and prompt configurations
- **Types**: `src/types.ts` - Central TypeScript definitions

## Key Architectural Patterns

### 1. Configuration-Driven Agent Creation
Agents are defined in `src/config/promptConfig.ts` as `PromptConfig` objects:
```typescript
{
  prompt: string,
  instructions?: string,
  tool?: "code-interpreter" | "function-tool" | "ai-search" | "bing-grounding",
  filePath?: string,  // For code-interpreter with file uploads
  emoji?: string
}
```

### 2. Tool Factory Pattern
`src/services/toolService.ts` uses a switch statement to create tools based on configuration:
- **code-interpreter**: Handles file uploads via `getCodeInterpreter()`
- **ai-search**: RAG functionality using Azure AI Search
- **function-tool**: Custom functions via `FunctionToolExecutor` class
- **bing-grounding**: Real-time web data with specific configuration object format

### 3. Stream-Based File Handling
Image/file downloads use Azure AI SDK's `StreamableMethod` pattern:
```typescript
const streamResponse = await client.agents.files.getContent(fileId).asNodeStream();
// Read stream chunks and concatenate for complete file
```

## Critical Development Patterns

### Environment Configuration
Required `.env` variables follow Azure AI Foundry connection string patterns:
- `AI_FOUNDRY_PROJECT_ENDPOINT` - Full project endpoint URL
- `AI_SEARCH_CONNECTION_ID` - Full resource path with subscription/resourceGroup
- `BING_GROUNDING_CONNECTION_ID` - Full resource path format

### Agent Lifecycle Management
All agents follow this pattern in `agentService.ts`:
1. Create tools via `createTools()`
2. Create agent with `x-ms-enable-preview` header
3. Create thread and add user message
4. Run agent with streaming
5. **Always cleanup**: Delete uploaded files and agent in `dispose()`

### Tool-Specific Implementation Notes

#### Bing Grounding Tool
Requires configuration object, not just connection ID:
```typescript
ToolUtility.createBingGroundingTool([{
  connectionId: bingGroundingConnectionId
}])
```

#### Function Tools
Custom functions are registered in `FunctionToolExecutor.functionTools[]` with both `func` and `definition` properties.

## Project-Specific Conventions

- Use ES modules (`type: "module"` in package.json)
- All imports end with `.js` extension for TypeScript files
- File paths in configs are relative to project root (`./files/`)
- Console output uses emojis and structured formatting via `utils/console.js`
- Agent names follow pattern: `agent-${selectedKey}`

## Development Workflow

- **Start demo**: `npm start` (interactive console)
- **Build**: `npm run build` (TypeScript compilation)
- **Examples**: `npm run basic|threads|messages|streaming|run` (individual examples)

## Common Integration Points

- Azure AI Foundry authentication via `DefaultAzureCredential`
- File uploads always use `assistants` purpose in `client.agents.files.upload()`
- All agent interactions require thread creation first
- Stream responses need explicit chunk reading and concatenation
