import axios from "axios";
import { invokePostCreationWithFeedback } from "../main";
import { IImage, Post } from "../models/Post"; // Your Post model
import { handlePostTimeInput } from "./linkedinService";

// Construct the Telegram API base URL
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const RECEIVER_TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

/**
 * Send a Telegram message with inline keyboard buttons for Accept/Reject.
 * @param title The post title.
 * @param content The post content.
 * @param images Array of generated images.
 * @param postId The database post ID.
 */
export async function sendTelegramMessage(title: string, content: string, images: IImage[], postId: string) {
    try {
        console.log('Sending Telegram Message...');
        const text = `Post Idea: *${title}*\n\n${content}`;
        const maxCaptionLength = 1024;
        const truncatedText = text.length > maxCaptionLength ? text.substring(0, maxCaptionLength - 3) + "..." : text;

        const inlineKeyboard = {
            inline_keyboard: [
                [
                    { text: "✅ Accept", callback_data: `ACCEPT_${postId}` },
                    { text: "❌ Reject", callback_data: `REJECT_${postId}` }
                ]
            ]
        };
        // Use sendPhoto to include an image with a truncated caption
        const photoUrl = images[0].url;
        const photoPayload = {
            chat_id: RECEIVER_TELEGRAM_CHAT_ID,
            photo: photoUrl,
            caption: "🚀 Post Idea below this message",
            parse_mode: "Markdown",
            reply_markup: inlineKeyboard
        };

        // Send the image first
        await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, photoPayload);

        console.log("Telegram post photo sent successfully.");
        // Send full content separately as a text message
        if (text.length > maxCaptionLength) {
            const textPayload = {
                chat_id: RECEIVER_TELEGRAM_CHAT_ID,
                text: `📌 *Full Post Idea:*\n\n${content}`,
                parse_mode: "Markdown",

            };
            await axios.post(`${TELEGRAM_API_URL}/sendMessage`, textPayload);
        }


    } catch (error) {
        console.error("Error sending Telegram message:", error);
    }
}


/**
 * Process the Telegram response (either from a callback query or a text message).
 * The function expects a unified object with:
 * - body: text from the message or callback_data
 * - payload: if available, e.g. "ACCEPT_12345" or "REJECT_12345"
 * - from: Telegram chat id of the sender.
 */
export async function processTelegramResponse(message: any) {
    const responseText = message.body.toLowerCase();
    console.log("Processing Telegram response for responseText:", responseText);
    let postId = null;

    // Extract postId from payload if available (for button clicks)
    if (message.payload) {
        const parts = message.payload.split("_");
        if (parts.length > 1) {
            postId = parts[1];
        }
    }

    // Receive improvement message
    if (responseText.split("_")[0] === "/improvement") {
        // Example: /improvement_12345: <improvement message>
        const msgPrefix = responseText.split(":")[0]; // /improvement_12345
        postId = msgPrefix.split("_")[1].replace(':', '');
        const improvementMessage = responseText.split(":")[1]; // <improvement message>
        console.log("Improvement message received for post:", postId, improvementMessage);
        if (!improvementMessage) {
            console.error("Improvement message is empty.");
            return;
        }
        const post = await Post.findById(postId);
        if (post) {
            post.feedbackImprovement = improvementMessage;
            await post.save();
        }
        const url = `${TELEGRAM_API_URL}/sendMessage`;
        await axios.post(url, {
            chat_id: message.from,
            text: `Thank you! We will regenerate the post with your feedback`,
            parse_mode: "Markdown",
        });
        await invokePostCreationWithFeedback(postId);
        return;
    }


    if (!postId) {
        console.error("No postId found in payload.");
        return;
    }

    // --- Accept Flow ---
    if (responseText.startsWith("accept")) {
        // Ask for the time to schedule the post.
        const url = `${TELEGRAM_API_URL}/sendMessage`;
        await axios.post(url, {
            chat_id: message.from,
            text: "Please provide the time you'd like to schedule the post (e.g., 14:30 for 2:30 PM)."
        });
        // Update post status to 'pending'
        await Post.findByIdAndUpdate(postId, { status: "accepted" });
        return;
    }

    // --- Time Input Flow ---
    // Check if response matches HH:MM format. Example: 14:30
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex.test(responseText)) {
        console.log("Post time input received for post:", postId, responseText);
        await handlePostTimeInput(postId, responseText);
        return;
    }

    // --- Reject Flow ---
    if (responseText.startsWith("reject")) {
        // Ask for rejection feedback.
        const url = `${TELEGRAM_API_URL}/sendMessage`;
        await axios.post(url, {
            chat_id: message.from,
            text: 'Please tell us why you are rejecting this post. Choose from the options below:\n1. Image quality\n2. Content idea\n3. Post content\n\nAdditionally, feel free to provide further feedback to improve the post.',
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [
                        { text: "1. Image quality", callback_data: `FEEDBACK_${postId}_image` },
                        { text: "2. Content idea", callback_data: `FEEDBACK_${postId}_idea` },
                        { text: "3. Post content", callback_data: `FEEDBACK_${postId}_content` }
                    ],
                ]
            })
        });

        // Update status to 'rejected'.
        await Post.findByIdAndUpdate(postId, { status: "rejected" });
        return;
    }

    // --- Feedback Flow ---
    if (responseText.startsWith("feedback")) {
        const topic = message.payload.split("_")[2];
        const post = await Post.findById(postId);
        if (post) {
            post.feedbackTopic = topic;
            await post.save();
            console.log(`Feedback type received for post ${postId}: ${topic}`);

            // Ask for improvement.
            const url = `${TELEGRAM_API_URL}/sendMessage`;
            await axios.post(url, {
                chat_id: message.from,
                text: `Please tell us how you would improve this post. Feel free to provide further feedback to improve the post.\n Follow the format to write your improvement: "/improvement_${postId}: <your improvement message>"`,
                parse_mode: "Markdown",
            });

            return;
        } else {
            console.log(`Post ${postId} not found.`);
        }
        return;
    }
}