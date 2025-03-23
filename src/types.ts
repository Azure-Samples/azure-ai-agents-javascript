export type PromptConfig = {
    prompt: string;
    aiSearch?: boolean;
    filePath?: string;
    fileId?: string;
    tool?: 'code-interpreter' | 'ai-search';
    tools?: any[];
    toolResources?: any;
    emoji?: string;
};