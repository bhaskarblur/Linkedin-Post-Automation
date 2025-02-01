import bodyParser from 'body-parser';
import express from 'express';
import mongoose from 'mongoose';
import cron from 'node-cron';
import { generatePostIdeas, generatePostWithFeedback } from './services/contentService';
import { generateImages } from './services/imageService';
import { savePost } from './services/postService';
import { processTelegramResponse } from './services/telegramService';
import { sendWhatsAppMessage } from './services/whatsappService';

cron.schedule('0 0 * * *', async () => {
    console.log('CRON: Running LinkedIn Automation Bot...');
    invokePostCreation(2);
});

const app = express();
app.use(bodyParser.json());


async function invokePostCreation(ideaCount: number) {
    console.log('Invoking Post Creation...');
    const posts = await generatePostIdeas(ideaCount);
    for (const post of posts) {
        console.log('Generating Images...');
        const images = await generateImages(post.imagePrompt, Number(process.env.POST_IMAGE_COUNT) || 1);
        console.log('Saving Post...');
        const savedPost = await savePost({ ...post, generatedImages: images });
        console.log('Sending WhatsApp Message...');
        await sendWhatsAppMessage(post.title, post.content, images, savedPost.id);
    }
}

export async function invokePostCreationWithFeedback(postId: string) {
    const post = await generatePostWithFeedback(postId);
    if (post) {
        console.log('Generating Images...');
        const images = await generateImages(post.imagePrompt, Number(process.env.POST_IMAGE_COUNT) || 1);
        console.log('Saving Post...');
        const savedPost = await savePost({ ...post, generatedImages: images });
        console.log('Sending WhatsApp Message...');
        await sendWhatsAppMessage(post.title, post.content, images, savedPost.id);
    }
}

app.get('/', (req, res) => {
    res.send('Server is running');
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
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        console.log("Received Telegram update:", JSON.stringify(body, null, 2));

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

