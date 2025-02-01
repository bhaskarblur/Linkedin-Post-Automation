import axios from 'axios';
import { invokePostCreationWithFeedback } from '../main';
import { IImage, Post } from '../models/Post'; // Assuming your postService has a Post model
import { handlePostTimeInput } from './linkedinService';

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || '';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const RECEIVER_WHATSAPP_NUMBER = process.env.RECEIVER_WHATSAPP_NUMBER || '';


export async function sendWhatsAppMessage(title: string, content: string, images: IImage[], postId: string) {
    try {
        const buttons = [
            { type: 'button', text: '✅ Accept', payload: `ACCEPT_${postId}` },
            { type: 'button', text: '❌ Reject', payload: `REJECT_${postId}` }
        ];

        const message = {
            to: RECEIVER_WHATSAPP_NUMBER,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: {
                    text: `Post Idea: *${title}*\n\n${content}`
                },
                action: {
                    buttons: buttons
                }
            },
            media: {
                type: 'image',
                url: images[0].url // Use the first image URL for WhatsApp media
            }
        };

        await axios.post(WHATSAPP_API_URL, message, {
            headers: {
                'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
    }
}

// Process the WhatsApp response and handle the post creation process
export async function processWhatsAppResponse(message: any) {
    // message.body is our text (from button or text message)
    // message.payload is expected to be like "ACCEPT_<postId>" or "REJECT_<postId>"
    const responseText = message.body.toLowerCase();
    let postId = null;

    // Try to extract postId from payload if available
    if (message.payload) {
        const parts = message.payload.split('_');
        if (parts.length > 1) {
            postId = parts[1];
        }
    }

    console.log('Processing WhatsApp response for post:', postId);

    // If no postId is found, log and exit (you may choose to handle this differently)
    if (!postId) {
        console.error('No postId found in the payload.');
        return;
    }

    // --- Accept Flow ---
    if (responseText.startsWith('accept')) {
        // Ask for the time to schedule the post
        await axios.post(WHATSAPP_API_URL, {
            to: RECEIVER_WHATSAPP_NUMBER,
            text: `Please provide the time you'd like to schedule the post (e.g., 14:30 for 2:30 PM).`
        },
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

        // Save the post with status "pending" and await the time input.
        const post = await Post.findById(postId);
        if (post) {
            post.status = 'pending'; // Change the status to pending
            await post.save();
        }
        return;
    }
    // --- Time Input Flow ---
    // Check if the response matches HH:MM format (for example, "14:30")
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex.test(responseText)) {
        console.log('Post time input received:', message);
        await handlePostTimeInput(postId, message);
        return;
    }
    // --- Reject Flow -
    if (responseText.startsWith('reject')) {
        // Ask for rejection feedback
        await axios.post(WHATSAPP_API_URL, {
            to: RECEIVER_WHATSAPP_NUMBER,
            text: `Please tell us why you are rejecting this post. Choose from: 
                   1. Image quality 
                   2. Content idea
                   3. Post content

                   Additionally, feel free to provide feedback to improve the post.`
        },
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
        await Post.findByIdAndUpdate(postId, { status: 'rejected' });
        return;
    }

    // --- Feedback Flow ---
    // Expecting feedback in the format: "feedback <topic> <your feedback message>"
    if (responseText.startsWith('feedback')) {
        // Example: "feedback content the explanation is too technical"
        const parts = responseText.split(' ');
        // parts[0] is "feedback", parts[1] is the topic, and the rest is the feedback
        const topic = parts[1];
        const feedback = parts.slice(2).join(' ');

        const post = await Post.findById(postId);
        if (post) {
            post.feedback = feedback;
            post.feedbackTopic = topic;
            await post.save();
            console.log(`Feedback received for post ${postId}: ${topic} - ${feedback}`);

            console.log('Invoking Post Creation With Feedback...');
            await invokePostCreationWithFeedback(postId);
        } else {
            console.log(`Post ${postId} not found.`);
        }
        return;
    }

}