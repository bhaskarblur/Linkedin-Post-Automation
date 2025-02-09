import 'dotenv/config';
import { OpenAI } from 'openai';
import type {
    MessageContent
} from 'openai/resources/beta/threads/messages';
import { GenerateMessage, RegenerateMessage } from '../constants/prompts';
import { IPost } from '../models/Post';

// Response interfaces
interface PostIdea {
    title: string;
    content: string;
    imagePrompt: string;
}

interface PostResponse {
    items: PostIdea[];
}

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || '';
const EXISTING_THREAD_ID = process.env.OPENAI_ASSISTANT_THREAD_ID || '';

if (!OPENAI_API_KEY || !ASSISTANT_ID || !EXISTING_THREAD_ID) {
    throw new Error('Missing required environment variables');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Type guard using type narrowing
function isTextContent(content: MessageContent): content is Extract<MessageContent, { type: 'text' }> {
    return content.type === 'text';
}

async function waitForRunCompletion(threadId: string, runId: string) {
    let run = await openai.beta.threads.runs.retrieve(threadId, runId);
    while (run.status === 'queued' || run.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        run = await openai.beta.threads.runs.retrieve(threadId, runId);
    }
    // Log run details for debugging
    console.log('Final run details:', JSON.stringify(run, null, 2));
    if (run.status !== 'completed') {
        throw new Error(`Run failed with status: ${run.status}`);
    }
}

export async function generatePostIdeas(count: number, prompt?: string): Promise<PostIdea[]> {
    try {
        await openai.beta.threads.messages.create(EXISTING_THREAD_ID, {
            role: 'user',
            content: GenerateMessage(count, prompt)
        });

        const run = await openai.beta.threads.runs.create(EXISTING_THREAD_ID, {
            assistant_id: ASSISTANT_ID,
        });
        await waitForRunCompletion(EXISTING_THREAD_ID, run.id);

        const messages = await openai.beta.threads.messages.list(EXISTING_THREAD_ID, {
            limit: 1,
            order: 'desc'
        });

        const latestMessage = messages.data[0];
        if (!latestMessage || latestMessage.role !== 'assistant') {
            throw new Error('No assistant message found');
        }

        const textContents = latestMessage.content.filter(isTextContent);
        if (textContents.length === 0) {
            throw new Error('No text content in assistant response');
        }

        const combinedResponse = textContents
            .map(content => content.text.value)
            .join('\n');

        const cleanedResponse = cleanChatGPTResponse(combinedResponse);
        const ideas: PostResponse = JSON.parse(cleanedResponse);

        if (!ideas.items?.length) {
            throw new Error('Invalid response format from assistant');
        }

        return ideas.items;
    } catch (error) {
        console.error('Error generating post ideas:', error);
        throw error;
    }
}

// Similar update for generatePostWithFeedback
export async function generatePostWithFeedback(post: IPost): Promise<PostIdea> {
    try {
        await openai.beta.threads.messages.create(EXISTING_THREAD_ID, {
            role: 'user',
            content: RegenerateMessage(post)
        });

        const run = await openai.beta.threads.runs.create(EXISTING_THREAD_ID, {
            assistant_id: ASSISTANT_ID,
        });
        await waitForRunCompletion(EXISTING_THREAD_ID, run.id);

        const messages = await openai.beta.threads.messages.list(EXISTING_THREAD_ID, {
            limit: 1,
            order: 'desc'
        });

        const latestMessage = messages.data[0];
        if (!latestMessage || latestMessage.role !== 'assistant') {
            throw new Error('No assistant message found');
        }

        const textContents = latestMessage.content.filter(isTextContent);
        if (textContents.length === 0) {
            throw new Error('No text content in assistant response');
        }

        const combinedResponse = textContents
            .map(content => content.text.value)
            .join('\n');

        const cleanedResponse = cleanChatGPTResponse(combinedResponse);
        const ideas: PostResponse = JSON.parse(cleanedResponse);

        if (!ideas.items?.[0]) {
            throw new Error('Invalid response format from assistant');
        }

        return ideas.items[0];
    } catch (error) {
        console.error('Error generating post with feedback:', error);
        throw error;
    }
}

function cleanChatGPTResponse(response: string): string {
    return response.replace(/```json|```/g, '').trim();
}