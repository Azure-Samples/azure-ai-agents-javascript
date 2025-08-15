# Azure AI Agents JavaScript Demo - Development Guide

## Project Structure

This Azure AI Agents demo showcases different tooling capabilities through a console-based interface. The architecture follows a service-oriented pattern with clear separation of concerns:

```
src/
├── index.ts                    # Entry point - Interactive console loop for demo selection
├── types.ts                    # Central TypeScript definitions and interfaces
├── config/
│   ├── env.ts                  # Environment variable configuration and validation
│   └── promptConfig.ts         # Agent configurations and prompt definitions
├── services/
│   ├── agentService.ts         # Core agent lifecycle management
│   ├── threadService.ts        # Thread and message handling with streaming
│   └── toolService.ts          # Tool factory and function execution
└── utils/
    ├── console.ts              # Interactive console utilities
    └── formatting.ts           # String formatting helpers

examples/                       # Individual SDK usage examples
├── 1-basic.ts                  # Basic agent creation and deletion
├── 2-threads.ts                # Thread management
├── 3-messages.ts               # Message handling
├── 4-streaming.ts              # Streaming responses
└── 5-run.ts                    # Agent run execution

files/                          # Sample data files for code interpreter demos
```

## Architecture Overview

### Configuration-Driven Agent Creation
Agents are defined as `PromptConfig` objects in `src/config/promptConfig.ts`:

```typescript
interface PromptConfig {
    prompt: string;                    // User prompt/query
    instructions?: string;             // Agent system instructions
    emoji?: string;                    // Display emoji for console UI
    tool?: "code-interpreter" | "function-tool" | "ai-search" | "bing-grounding";
    filePath?: string;                 // File path for code-interpreter uploads
    fileId?: string;                   // Runtime file ID tracking
    executor?: any;                    // Function tool executor reference
    tools?: ToolDefinition[];          // Azure AI tool definitions
    toolResources?: any;               // Tool-specific resource configurations
}
```

### Tool Factory Pattern
`src/services/toolService.ts` implements a factory pattern for tool creation:
- **code-interpreter**: File upload handling and Python code execution
- **ai-search**: RAG functionality using Azure AI Search indexes
- **function-tool**: Custom JavaScript functions via `FunctionToolExecutor`
- **bing-grounding**: Real-time web data with connection configuration

### Agent Lifecycle Management
All agents follow this standardized lifecycle in `agentService.ts`:
1. Create tools via `createTools()` factory
2. Create agent with Azure AI Projects client
3. Create thread and add user message
4. Execute agent with streaming response handling
5. **Always cleanup**: Delete uploaded files and agent resources

## Coding Conventions

### Module System
- **ES Modules**: Project uses `"type": "module"` in package.json
- **Import Extensions**: All TypeScript imports must end with `.js` extension
- **File Paths**: Configuration file paths are relative to project root (`./files/`)

### Naming Conventions
- **Agent Names**: Follow pattern `agent-${selectedKey}` where selectedKey is the prompt configuration key
- **File Naming**: camelCase for TypeScript files, kebab-case for configuration files
- **Function Naming**: Descriptive camelCase with clear action verbs

### Code Style
- **TypeScript Strict Mode**: All code must pass strict TypeScript compilation
- **Async/Await**: Prefer async/await over Promises for better readability
- **Error Handling**: Use try/catch blocks with descriptive error messages
- **Console Output**: Use emojis and structured formatting for user experience

### Environment Configuration
Required environment variables follow Azure AI Foundry patterns:
```bash
AI_FOUNDRY_PROJECT_ENDPOINT=https://<endpoint>.services.ai.azure.com/api/projects/<project>
AI_MODEL=gpt-4o
AI_SEARCH_CONNECTION_ID=/subscriptions/.../connections/<name>  # Optional
AI_SEARCH_INDEX_NAME=<index-name>                              # Optional
BING_GROUNDING_CONNECTION_ID=/subscriptions/.../connections/<name>  # Optional
```

### Azure SDK Integration
- **Authentication**: Use `DefaultAzureCredential` for Azure resource access
- **File Uploads**: Always use `assistants` purpose in `client.agents.files.upload()`
- **Headers**: Include `x-ms-enable-preview: true` for preview features
- **Resource Cleanup**: Always delete created agents and uploaded files

## Testing Protocols

### Build and Validation
```bash
# TypeScript compilation
npm run build

# Lint check (via TypeScript strict mode)
npx tsc --noEmit
```

### Example Execution
Individual SDK examples can be run to test specific functionality:
```bash
npm run basic        # Basic agent creation/deletion
npm run threads      # Thread management
npm run messages     # Message handling
npm run streaming    # Streaming responses
npm run run          # Complete agent run cycle
```

### Interactive Demo Testing
```bash
npm start           # Start interactive console demo
# Test each agent type:
# 1. Basic calculation (no tools)
# 2. Function calling (CPU usage)
# 3. Code generation (code interpreter)
# 4. Data visualization (CSV analysis)
# 5. Insurance coverage (AI Search)
# 6. Stock market (Bing Grounding)
```

### Environment Testing
Verify environment configuration before running:
- Azure AI Foundry project endpoint accessibility
- Model deployment availability
- Optional service connections (AI Search, Bing Grounding)

### Resource Cleanup Validation
- Agents are properly deleted after execution
- Uploaded files are removed from storage
- No persistent resources remain after demo completion

## Development Workflow

### Setup
1. Clone repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.template .env
   # Edit .env with your Azure AI Foundry details
   ```

3. Build project:
   ```bash
   npm run build
   ```

### Development Cycle
1. **Code Changes**: Make modifications in `src/` directory
2. **Build**: Run `npm run build` to compile TypeScript
3. **Test**: Use `npm start` for interactive testing or individual examples
4. **Validate**: Ensure resource cleanup and error handling work correctly

### Adding New Agent Types
1. Add new configuration to `src/config/promptConfig.ts`
2. Extend tool factory in `src/services/toolService.ts` if needed
3. Test with interactive demo and example scripts
4. Ensure proper resource cleanup in disposal logic

## Pull Request Guidelines

### Code Quality Requirements
- **TypeScript Compilation**: All code must compile without errors using `npm run build`
- **Strict Mode Compliance**: Code must pass TypeScript strict mode checks
- **Import Consistency**: Use `.js` extensions for all TypeScript imports
- **Error Handling**: Include proper try/catch blocks and meaningful error messages

### PR Description Format
Include the following sections in your PR description:
- **Summary**: Brief description of changes and motivation
- **Testing**: How the changes were tested (build, examples, interactive demo)
- **Resource Management**: Confirmation that resource cleanup works correctly
- **Breaking Changes**: Any changes to public APIs or configuration format

### Commit Message Standards
- Use descriptive commit messages with action verbs
- Include scope when relevant: `feat(agents): add new tool type`
- Reference issue numbers: `fixes #123`

### Review Checklist
- [ ] Code compiles successfully with `npm run build`
- [ ] Interactive demo works with new changes
- [ ] Resource cleanup functions properly
- [ ] Environment variables are documented if added
- [ ] Error handling covers edge cases
- [ ] Console output maintains user-friendly formatting

### Azure-Specific Considerations
- **Authentication**: Verify DefaultAzureCredential integration
- **Service Connections**: Test optional service integrations gracefully fail when not configured
- **API Compatibility**: Ensure compatibility with Azure AI Projects SDK versions
- **Resource Limits**: Consider token usage and rate limiting implications

## Common Integration Points

### Azure AI Foundry
- Project endpoint configuration and authentication
- Model deployment access and token management
- Preview feature enablement via request headers

### File Management
- Upload files with `assistants` purpose for code interpreter
- Handle streaming file downloads for generated content
- Implement proper cleanup to avoid storage costs

### Tool Integration
- Azure AI Search for RAG functionality with document indexing
- Bing Grounding for real-time web data access
- Function tools for custom JavaScript execution
- Code interpreter for Python code execution and file generation

### Error Scenarios
- Network connectivity issues with Azure services
- Missing or invalid authentication credentials
- Tool-specific failures (search index unavailable, file upload errors)
- Model or deployment availability issues