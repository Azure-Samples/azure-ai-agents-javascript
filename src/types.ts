import type { ToolDefinition } from '@azure/ai-projects';

export interface PromptConfig {
    prompt: string;
    instructions?: string;
    emoji?: string;
    tool?: "code-interpreter" | "function-tool" | "ai-search" | "bing-grounding";
    filePath?: string;
    fileId?: string;
    aiSearch?: boolean;
    executor?: any;
    tools?: ToolDefinition[];
    toolResources?: any;
}