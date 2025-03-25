import type { ToolDefinition } from '@azure/ai-projects';

export interface PromptConfig {
    prompt: string;
    emoji?: string;
    tool?: string;
    filePath?: string;
    fileId?: string;
    aiSearch?: boolean;
    tools?: ToolDefinition[];
    toolResources?: any;
}