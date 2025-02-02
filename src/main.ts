import bodyParser from 'body-parser';
import express from 'express';
import mongoose from 'mongoose';
import cron from 'node-cron';
import { Post } from './models/Post';
import { generatePostIdeas, generatePostWithFeedback } from './services/contentService';
import { generateImages } from './services/imageService';
import { savePost } from './services/postService';
import { failedToGenerateImagesMessage, failedToGeneratePostWithFeedbackMessage, processTelegramResponse, sendTelegramMessage } from './services/telegramService';

cron.schedule('0 0 * * *', async () => {
    console.log('CRON: Running LinkedIn Automation Bot...');
    invokePostCreation(2);
});

const app = express();
app.use(bodyParser.json());


export async function invokePostCreation(ideaCount: number, prompt?: string, chatId?: string) {
    try {
        console.log('Invoking Post Creation...');
        const posts = await generatePostIdeas(ideaCount, prompt);
        for (const post of posts) {
            console.log('Starting to generate images for post:', post.title);
            const images = await generateImages(post.imagePrompt, Number(process.env.DEFAULT_POST_IMAGE_COUNT) || 1);
            const savedPost = await savePost({ ...post, generatedImages: images });
            await sendTelegramMessage(post.title, post.content, images, savedPost.id, chatId);
        }
    } catch (error) {
        // if error is failed to generate images, then send a message to the user
        if (error instanceof Error) {
            await failedToGenerateImagesMessage(error.message, chatId);
        }
        console.error('Error invoking post creation:', error);
    }
}

export async function invokePostCreationWithFeedback(postId: string, chatId?: string) {
    try {
        const postDetails = await Post.findById(postId);
        if (!postDetails) {
            throw new Error('Post not found');
        }
        const newPost = await generatePostWithFeedback(postDetails);
        console.log("New Post:", newPost);
        if (newPost) {
            if (postDetails.feedbackTopic == 'image' || postDetails.feedbackTopic == 'idea') {
                console.log('Generating Images...');
                const images = await generateImages(newPost.imagePrompt, Number(process.env.DEFAULT_POST_IMAGE_COUNT) || 1);
                postDetails.generatedImages = images;
            }
            // Update the post accordingly
            if (postDetails.feedbackTopic === 'idea') {
                postDetails.title = newPost.title;
                postDetails.content = newPost.content;
                postDetails.imagePrompt = newPost.imagePrompt;
            } else if (postDetails.feedbackTopic === 'content') {
                postDetails.content = newPost.content;
            } else if (postDetails.feedbackTopic === 'image') {
                postDetails.imagePrompt = newPost.imagePrompt;
            }
            await postDetails.save();
            await sendTelegramMessage(newPost.title, newPost.content, postDetails.generatedImages, postDetails.id);
        }
    } catch (error) {
        if (error instanceof Error) {
            await failedToGeneratePostWithFeedbackMessage(error.message, chatId);
        }
        console.error('Error invoking post creation with feedback:', error);
    }
}

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.get('/generate', (req, res) => {
    // Header validation with x-api-key
    const apiKey = req.headers['x-api-key'];
    const prompt = req.query.prompt as string;
    if (apiKey !== process.env.API_KEY) {
        res.status(401).json({ message: 'Please provide a valid API key' });
        return;
    }
    const ideaCount = req.query.count ? parseInt(req.query.count as string) : 2;
    invokePostCreation(ideaCount, prompt);
    res.json({ message: 'Post generation initiated!' });
});
/**
 * Example Telegram update for a callback query:
 * {
 *   "update_id": 123456789,
 *   "callback_query": {
 *     "id": "unique-callback-id",
 *     "from": { "id": 987654321, "first_name": "John", ... },
 *     "message": { "message_id": 55, "chat": { "id": 987654321, ... }, "text": "Post Idea: ..." },
 *     "data": "ACCEPT_1234567890"  // our payload
 *   }
 * }
 *
 * Example Telegram update for a text message:
 * {
 *   "update_id": 123456790,
 *   "message": {
 *     "message_id": 56,
 *     "from": { "id": 987654321, "first_name": "John", ... },
 *     "chat": { "id": 987654321, ... },
 *     "date": 1610000000,
 *     "text": "14:30"
 *   }
 * }
 */
app.post('/webhook/telegram', async (req, res) => {
    try {
        const body = req.body;
        console.log("Received Telegram update:\n", JSON.stringify(body, null, 2));

        let messageData: any = {};
        // If the update is a callback query (button press)
        if (body.callback_query) {
            messageData.body = body.callback_query.data; // e.g., "ACCEPT_12345" or "REJECT_12345"
            messageData.payload = body.callback_query.data;
            messageData.from = body.callback_query.from.id; // Telegram user id
        }
        // Otherwise, if it's a regular text message
        else if (body.message) {
            messageData.body = body.message.text; // e.g., "14:30" or feedback text
            messageData.payload = null; // For text responses, we may not have payload info.
            messageData.from = body.message.chat.id; // Chat id (usually same as user id in private chats)
        }

        await processTelegramResponse(messageData);
        res.status(200).send({ status: "Message processed" });
    } catch (error) {
        console.error("Error processing Telegram update:", error);
        res.status(500).send({ error: "Internal server error" });
    }
});

mongoose.connect(process.env.MONGODB_URI || '')
    .then(() => console.log('MongoDB connected successfully'))
    .catch((error) => console.error('MongoDB connection error:', error));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

