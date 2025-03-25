import type { ToolDefinition, ToolResources } from '@azure/ai-projects';

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