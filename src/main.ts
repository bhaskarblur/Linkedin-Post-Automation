import bodyParser from 'body-parser';
import express from 'express';
import cron from 'node-cron';
import { generatePostIdeas, generatePostWithFeedback } from './services/contentService';
import { generateImages } from './services/imageService';
import { savePost } from './services/postService';
import { processWhatsAppResponse, sendWhatsAppMessage } from './services/whatsappService';

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


/**
 * Sample webhook body from Meta’s WhatsApp Business API:
 * {
 *   "object": "whatsapp_business_account",
 *   "entry": [{
 *     "id": "WHATSAPP_BUSINESS_ID",
 *     "changes": [{
 *       "value": {
 *         "messaging_product": "whatsapp",
 *         "metadata": { "phone_number_id": "PHONE_NUMBER_ID" },
 *         "contacts": [{
 *            "profile": { "name": "John Doe" },
 *            "wa_id": "USER_WHATSAPP_NUMBER"
 *         }],
 *         "messages": [{
 *           "from": "USER_WHATSAPP_NUMBER",
 *           "id": "wamid.HASH_ID",
 *           "timestamp": "1700000000",
 *           "type": "button", // or "text"
 *           "button": {
 *             "text": "✅ Accept",
 *             "payload": "ACCEPT_666666666666666666666666"
 *           }
 *           // OR if type is text:
 *           // "text": { "body": "14:30" }
 *         }]
 *       },
 *       "field": "messages"
 *     }]
 *   }]
 * }
 */
app.post('/webhook/whatsapp', async (req, res) => {
    try {
        const body = req.body;
        console.log('Received WhatsApp Webhook:', JSON.stringify(body, null, 2));

        // Extract the first message from the first entry change
        if (
            body.object === 'whatsapp_business_account' &&
            body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0].value &&
            body.entry[0].changes[0].value.messages &&
            body.entry[0].changes[0].value.messages.length > 0
        ) {
            const incomingMessage = body.entry[0].changes[0].value.messages[0];
            let payload = null;
            let messageText = '';

            // If the message is of type "button", extract its text and payload
            if (incomingMessage.type === 'button' && incomingMessage.button) {
                messageText = incomingMessage.button.text;
                payload = incomingMessage.button.payload;
            }
            // Otherwise, if it's a text message, extract the text.
            else if (incomingMessage.type === 'text' && incomingMessage.text) {
                messageText = incomingMessage.text.body;
                // For text responses (e.g., time input), we assume the payload was included
                // from a previous interaction. Adjust as needed.
                payload = incomingMessage.context?.id || null;
            }

            // Create a unified message object to pass along:
            const messageData = {
                body: messageText,
                payload, // e.g., "ACCEPT_666666666666666666666666" or null for text replies
                from: incomingMessage.from, // The sender's WhatsApp number
            };

            await processWhatsAppResponse(messageData);
        }

        res.status(200).send({ status: 'Message processed' });
    } catch (error) {
        console.error('Error processing WhatsApp response:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
