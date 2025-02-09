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
let EXISTING_THREAD_ID = process.env.OPENAI_ASSISTANT_THREAD_ID || '';

if (!OPENAI_API_KEY || !ASSISTANT_ID || !EXISTING_THREAD_ID) {
    throw new Error('Missing required environment variables');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Type guard using type narrowing
function isTextContent(content: MessageContent): content is Extract<MessageContent, { type: 'text' }> {
    return content.type === 'text';
}

// Add delay utility function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Add message storage for retries
const messageStore = new Map<string, string>();

// Add function to clear thread messages
async function clearThread(threadId: string) {
    try {
        console.log('Clearing thread messages...');
        const messages = await openai.beta.threads.messages.list(threadId);
        for (const message of messages.data) {
            await openai.beta.threads.messages.del(threadId, message.id);
        }
        console.log('Thread cleared successfully');
    } catch (error) {
        console.error('Error clearing thread:', error);
        // Create a new thread if clearing fails
        const newThread = await openai.beta.threads.create();
        process.env.OPENAI_ASSISTANT_THREAD_ID = newThread.id;
        EXISTING_THREAD_ID = newThread.id;
        console.log('Created new thread:', newThread.id);
    }
}

async function waitForRunCompletion(threadId: string, runId: string, maxRetries = 3) {
    let retryCount = 0;
    let run = await openai.beta.threads.runs.retrieve(threadId, runId);

    while (run.status === 'queued' || run.status === 'in_progress') {
        await delay(1000);
        run = await openai.beta.threads.runs.retrieve(threadId, runId);
    }

    // Handle rate limiting
    while (run.status === 'failed' && run.last_error?.code === 'rate_limit_exceeded' && retryCount < maxRetries) {
        console.log(`Rate limit exceeded. Attempt ${retryCount + 1}/${maxRetries}. Clearing thread and retrying...`);

        // Clear the thread before retrying
        await clearThread(threadId);
        await delay(5000); // Wait 5 seconds after clearing

        // Recreate the message in the cleared thread
        const originalMessage = messageStore.get(runId);
        if (originalMessage) {
            await openai.beta.threads.messages.create(threadId, {
                role: 'user',
                content: originalMessage
            });
        }

        // Create a new run
        run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: ASSISTANT_ID,
        });

        // Store new run ID and message
        messageStore.set(run.id, originalMessage || '');

        // Wait for the new run
        while (run.status === 'queued' || run.status === 'in_progress') {
            await delay(1000);
            run = await openai.beta.threads.runs.retrieve(threadId, run.id);
        }

        retryCount++;
    }

    // Clean up stored message
    messageStore.delete(runId);

    // Log run details for debugging
    console.log('Final run details:', JSON.stringify(run, null, 2));

    if (run.status !== 'completed') {
        if (run.last_error?.code === 'rate_limit_exceeded') {
            throw new Error(`Rate limit exceeded after ${maxRetries} retries. Please try again later.`);
        }
        throw new Error(`Run failed with status: ${run.status}`);
    }

    return run;
}

export async function generatePostIdeas(count: number, prompt?: string): Promise<PostIdea[]> {
    try {
        const message = prompt ?
            GenerateMessage(Math.min(count, 2), prompt) :
            GenerateMessage(Math.min(count, 3));

        // Create initial message
        await openai.beta.threads.messages.create(EXISTING_THREAD_ID, {
            role: 'user',
            content: message
        });

        const run = await openai.beta.threads.runs.create(EXISTING_THREAD_ID, {
            assistant_id: ASSISTANT_ID,
        });

        // Store message for potential retries
        messageStore.set(run.id, message);

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
        if (error instanceof Error && error.message.includes('rate_limit_exceeded')) {
            // Handle rate limit error specifically
            throw new Error('Service is temporarily busy. Please try again in a few minutes.');
        }
        throw error;
    }
}

// Update generatePostWithFeedback similarly
export async function generatePostWithFeedback(post: IPost): Promise<PostIdea> {
    try {
        const message = RegenerateMessage(post);

        // Create initial message
        await openai.beta.threads.messages.create(EXISTING_THREAD_ID, {
            role: 'user',
            content: message
        });

        const run = await openai.beta.threads.runs.create(EXISTING_THREAD_ID, {
            assistant_id: ASSISTANT_ID,
        });

        // Store message for potential retries
        messageStore.set(run.id, message);

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
        if (error instanceof Error && error.message.includes('rate_limit_exceeded')) {
            throw new Error('Service is temporarily busy. Please try again in a few minutes.');
        }
        throw error;
    }
}

function cleanChatGPTResponse(response: string): string {
    return response.replace(/```json|```/g, '').trim();
}