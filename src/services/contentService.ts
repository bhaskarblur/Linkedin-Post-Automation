import 'dotenv/config';
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { GenerateMessage, POST_IDEA_PROMPT, RegenerateMessage } from '../constants/prompts';
import { IPost } from '../models/Post';
// Define the structure of a post idea
interface PostIdea {
    title: string;
    content: string;
    imagePrompt: string;
}

// Ensure the OpenAI API key is set in the environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    throw new Error('Missing required environment variable: OPENAI_API_KEY');
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});


// Function to generate post ideas using GPT-4o
export async function generatePostIdeas(count: number, prompt?: string): Promise<PostIdea[]> {
    try {

        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: POST_IDEA_PROMPT },
            { role: 'user', content: GenerateMessage(count, prompt) },
        ];
        console.log('messages:', messages);
        // Call the OpenAI API with the GPT-4o model
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Specify the GPT-4o model
            messages: messages,
            max_tokens: 9600, // Adjust based on API limits
            temperature: 0.7, // Controls creativity
            n: count, // Number of completions to generate
        });


        console.log('response from chat gpt:\n', response.choices[0].message?.content);
        const cleanedResponse = cleanChatGPTResponse(response.choices[0].message?.content || '');
        // Parse the JSON response
        var ideas: PostIdea[] = JSON.parse(cleanedResponse);
        console.log('ideas:\n', ideas);
        console.log('ideas count:', ideas.length);
        // If the response is not an array, make it an array
        if (ideas.length === undefined) {
            ideas = [JSON.parse(cleanedResponse)];
        }
        return ideas;
    } catch (error) {
        console.error('Error generating post ideas:', error);
        throw new Error(`${error}`);
    }
}

export async function generatePostWithFeedback(post: IPost): Promise<PostIdea | null> {
    try {
        // Call the OpenAI API with the GPT-4o model
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Specify the GPT-4o model
            messages: [
                { role: 'system', content: POST_IDEA_PROMPT },
                { role: 'user', content: 'Generate a post idea for LinkedIn.' },
                {
                    role: 'assistant', content:
                        `{title: ${post.title},
                    content: ${post.content},
                    imagePrompt: ${post.imagePrompt}}`
                },
                {
                    role: 'user',
                    content: RegenerateMessage(post)
                }
            ],
            max_tokens: 9600, // Adjust based on API limits
            temperature: 0.7, // Controls creativity
            n: 1, // Number of completions to generate
        });

        console.log('improved response from chat gpt:\n', response.choices[0].message?.content);

        // Parse the JSON response
        const cleanedResponse = cleanChatGPTResponse(response.choices[0].message?.content || '');
        const idea: PostIdea = JSON.parse(cleanedResponse);

        console.log('updated idea:', idea);
        return idea;
    } catch (error) {
        console.error('Error generating post with feedback:', error);
        throw new Error(`${error}`);
    }
}

function cleanChatGPTResponse(response: string) {
    // Remove triple backticks and trim whitespace
    return response.replace(/```json|```/g, '').trim();
}
