import { PromptConfig } from '../types.js';

// Define prompt configurations
export const promptConfig: Record<string, PromptConfig> = {
    solveEquation: {
        prompt: 'I need to solve the equation `3x + 11 = 14`. Can you help me?',
        emoji: '🧮'
    },
    codeGenerator: {
        prompt: 'Write a function that finds prime numbers',
        tool: 'code-interpreter',
        emoji: '💻'
    },
    dataVisualization: {
        prompt: `Create visualizations from the car_sales.csv data. Include charts for:
            - Sales by Region 
            - Relationships between Price, Mileage, and Year. 
            - Sales by SalesPerson.
            - Sales by Make, Model, and Year for 2023.`,
        tool: 'code-interpreter',
        filePath: './files/car_sales_data.csv',
        emoji: '📊'
    },
    hotelReviews: {
        prompt: 'Tell me about the hotel reviews in the HotelReviews_data.csv.',
        tool: 'code-interpreter',
        fileId: '',
        filePath: './files/hotel_reviews_data.csv',
        emoji: '🏨'
    },
    insuranceCoverage: {
        prompt: 'What are my health insurance plan coverage types?',
        tool: 'ai-search',
        emoji: '🏥'
    }
};