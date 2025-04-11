import { PromptConfig } from '../types.js';

export const promptConfig: Record<string, PromptConfig> = {
    solveEquation: {
        prompt: 'I need to solve the equation `3x + 11 = 14`. Can you help me?',
        emoji: '🧮'
    },
    localCpusUsage: {
        prompt: 'What is the average CPUs usage on my local machine?',
        instructions: 'Always use the function tool to get the CPUs usage.',
        emoji: '💾',
        tool: 'function-tool',
        executor: null, // set at runtime (see toolService.ts)
    },
    codeGenerator: {
        prompt: 'Write a function that finds prime numbers',
        instructions: 'Always use the code interpreter to generate code.',
        tool: 'code-interpreter',
        emoji: '💻'
    },
    dataVisualization: {
        prompt: `Create visualizations from the car_sales.csv data. Include charts for:
        - Sales by Region 
        - Relationships between Price, Mileage, and Year. 
        - Sales by SalesPerson.
        - Sales by Make, Model, and Year for 2023.`,
        instructions: 'Always use the code interpreter to generate visualizations.',
        tool: 'code-interpreter',
        filePath: './files/car_sales_data.csv',
        emoji: '📊'
    },
    hotelReviews: {
        prompt: 'Tell me about the hotel reviews in the hotel_reviews_data.csv.',
        instructions: 'Always use the code interpreter to analyze the data.',
        tool: 'code-interpreter',
        fileId: '',
        filePath: './files/hotel_reviews_data.csv',
        emoji: '🏨'
    },
    insuranceCoverage: {
        prompt: 'What are my health insurance plan coverage types?',
        instructions: 'Always use the AI Search tool to analyze the data.',
        tool: 'ai-search',
        emoji: '🏥'
    }
};