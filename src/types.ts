export type PromptConfig = {
    prompt: string;
    aiSearch?: boolean;
    filePath?: string;
    fileId?: string;
    tools?: any[];
    toolResources?: any;
};