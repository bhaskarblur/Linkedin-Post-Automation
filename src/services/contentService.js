"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePostIdeas = generatePostIdeas;
exports.generatePostWithFeedback = generatePostWithFeedback;
require("dotenv/config");
const openai_1 = require("openai");
const prompts_1 = require("../constants/prompts");
// Ensure the OpenAI API key is set in the environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    throw new Error('Missing required environment variable: OPENAI_API_KEY');
}
const openai = new openai_1.OpenAI({
    apiKey: OPENAI_API_KEY,
});
// Function to generate post ideas using GPT-4o
function generatePostIdeas(count, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            // Call the OpenAI API with the GPT-4o model
            const response = yield openai.chat.completions.create({
                model: 'gpt-4o', // Specify the GPT-4o model
                messages: [
                    { role: 'system', content: prompts_1.POST_IDEA_PROMPT },
                    { role: 'user', content: (0, prompts_1.GenerateMessage)(count, prompt) },
                ],
                max_tokens: 3600, // Adjust based on API limits
                temperature: 0.7, // Controls creativity
                n: count, // Number of completions to generate
            });
            console.log('response from chat gpt:\n', (_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content);
            const cleanedResponse = cleanChatGPTResponse(((_b = response.choices[0].message) === null || _b === void 0 ? void 0 : _b.content) || '');
            // Parse the JSON response
            var ideas = JSON.parse(cleanedResponse);
            console.log('ideas:\n', ideas);
            console.log('ideas count:', ideas.length);
            // If the response is not an array, make it an array
            if (ideas.length === undefined) {
                ideas = [JSON.parse(cleanedResponse)];
            }
            return ideas;
        }
        catch (error) {
            console.error('Error generating post ideas:', error);
            throw new Error('Failed to generate post ideas');
        }
    });
}
function generatePostWithFeedback(post) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            // Call the OpenAI API with the GPT-4o model
            const response = yield openai.chat.completions.create({
                model: 'gpt-4o', // Specify the GPT-4o model
                messages: [
                    { role: 'system', content: prompts_1.POST_IDEA_PROMPT },
                    { role: 'user', content: 'Generate a post idea for LinkedIn.' },
                    {
                        role: 'assistant', content: `title: ${post.title}
                    content: ${post.content}
                    imagePrompt: ${post.imagePrompt},
                    `
                    },
                    {
                        role: 'user',
                        content: (0, prompts_1.RegenerateMessage)(post)
                    }
                ],
                max_tokens: 3600, // Adjust based on API limits
                temperature: 0.7, // Controls creativity
                n: 1, // Number of completions to generate
            });
            console.log('improved response from chat gpt:\n', (_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content);
            // Parse the JSON response
            const cleanedResponse = cleanChatGPTResponse(((_b = response.choices[0].message) === null || _b === void 0 ? void 0 : _b.content) || '');
            const idea = JSON.parse(cleanedResponse);
            console.log('updated idea:', idea);
            return idea;
        }
        catch (error) {
            console.error('Error generating post with feedback:', error);
            throw new Error('Failed to generate post with feedback');
        }
    });
}
function cleanChatGPTResponse(response) {
    // Remove triple backticks and trim whitespace
    return response.replace(/```json|```/g, '').trim();
}
