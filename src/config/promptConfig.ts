import { PromptConfig } from '../types.js';

export const promptConfig: Record<string, PromptConfig> = {
    solveEquation: {
        prompt: 'I need to solve the equation `3x + 11 = 14`. Can you help me?',
        instructions: 'You are a math agent. Use your knowledge to solve the equation.',
        emoji: '🧮'
    },
    localCpusUsage: {
        prompt: 'What is the average CPUs usage on my local machine?',
        instructions: 'You are a system administrator agent specializing in system performance and monitoring. Use the provided function to get the average CPU usage.',
        emoji: '💾',
        tool: 'function-tool',
        executor: null, // set at runtime (see toolService.ts)
    },
    codeGenerator: {
        prompt: 'Write a function that finds prime numbers',
        instructions: 'You are a math genius and a coding agent, specilizing in assisting with code generation.',
        tool: 'code-interpreter',
        emoji: '💻'
    },
    dataVisualization: {
        prompt: `Create visualizations from the car_sales.csv data. Include charts for:
        - Sales by Region 
        - Relationships between Price, Mileage, and Year. 
        - Sales by SalesPerson.
        - Sales by Make, Model, and Year for 2023.`,
        instructions: 'You are a data visualization agent. Use the remote code interpreter to analyze the data.',
        tool: 'code-interpreter',
        filePath: './files/car_sales_data.csv',
        emoji: '📊'
    },
    hotelReviews: {
        prompt: 'Tell me about the hotel reviews in the hotel_reviews_data.csv.',
        instructions: 'You are a data analysis agent. Use the remote code interpreter to analyze the data.',
        tool: 'code-interpreter',
        fileId: '',
        filePath: './files/hotel_reviews_data.csv',
        emoji: '🏨'
    },
    insuranceCoverage: {
        prompt: 'What are my health insurance plan coverage types?',
        instructions: 'You are a health insurance agent. Use the provided AI search tool to analyze the data.',
        tool: 'ai-search',
        emoji: '🏥'
    },
    stockMarket: {
        prompt: 'What are the latest trends in the stock market?',
        instructions: 'You are a stock market analyst. Use the provided Bing Grounding tool to analyze the data.',
        tool: 'bing-grounding',
        emoji: '📈'
    }
};