import axios from 'axios';
import { IImage, Post } from '../models/Post'; // Assuming your postService has a Post model

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || '';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || '';
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '';


export async function sendWhatsAppMessage(title: string, content: string, images: IImage[], postId: string) {
    try {
        const buttons = [
            { type: 'button', text: '✅ Accept', payload: `ACCEPT_${postId}` },
            { type: 'button', text: '❌ Reject', payload: `REJECT_${postId}` }
        ];

        const message = {
            to: WHATSAPP_NUMBER,
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

// Capture the time input and schedule the post on LinkedIn
export async function processWhatsAppResponse(message: any) {
    const responseText = message.body.toLowerCase();
    const postId = message.payload.split('_')[1]; // Extract postId from the payload

    if (responseText.startsWith('accept')) {
        // Ask for the time to schedule the post
        await axios.post(WHATSAPP_API_URL, {
            to: WHATSAPP_NUMBER,
            text: `Please provide the time you'd like to schedule the post (e.g., 14:30 for 2:30 PM).`
        });

        // Save the post with status "pending" and await the time input.
        const post = await Post.findById(postId);
        if (post) {
            post.status = 'pending'; // Change the status to pending
            await post.save();
        }
    } else if (responseText.startsWith('reject')) {
        // Ask for rejection feedback
        await axios.post(WHATSAPP_API_URL, {
            to: WHATSAPP_NUMBER,
            text: `Please tell us why you are rejecting this post. Choose from: 
                   1. Image quality 
                   2. Content idea
                   3. Post content

                   Additionally, feel free to provide feedback to improve the post.`
        });

        // Process the feedback and re-generate post if necessary
    }
}

// Handle received time and schedule the post on LinkedIn
export async function handlePostTimeInput(postId: string, time: string) {
    try {
        // Parse the time (e.g., 14:30 for 2:30 PM)
        const postTime = new Date();
        const [hours, minutes] = time.split(':');
        postTime.setHours(Number(hours), Number(minutes), 0, 0); // Set the time

        // Update the post with the selected time
        const post = await Post.findById(postId);
        if (post) {
            post.postTime = postTime; // Save the selected time
            post.status = 'accepted'; // Update status to accepted
            await post.save();

            // Now schedule the post on LinkedIn
            await scheduleLinkedInPost(post, postId);
        }
    } catch (error) {
        console.error('Error handling post time:', error);
    }
}

// Function to schedule the post on LinkedIn
async function scheduleLinkedInPost(post: any, postId: string) {
    try {
        const postData = {
            content: {
                title: post.title,
                description: post.content,
                media: [
                    {
                        mediaUrl: post.generatedImages[0].url // First image
                    }
                ]
            },
            postTime: post.postTime // Scheduled time
        };

        // LinkedIn API endpoint for scheduling posts (example)
        const LINKEDIN_API_URL = 'https://api.linkedin.com/v2/ugcPosts';

        // Prepare the LinkedIn API request
        const response = await axios.post(LINKEDIN_API_URL, postData, {
            headers: {
                'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Post scheduled on LinkedIn:', response.data);
        // Save the post with status "pending" and await the time input.
        const _post = await Post.findById(postId);
        if (_post) {
            _post.status = 'scheduled'; // Change the status to pending
            await _post.save();
        }
    } catch (error) {
        console.error('Error scheduling post on LinkedIn:', error);
    }
}
