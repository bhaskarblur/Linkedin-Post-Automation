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
        const text = `Post Idea: *${title}*\n\n${content}`;
        const inlineKeyboard = {
            inline_keyboard: [
                [
                    { text: "✅ Accept", callback_data: `ACCEPT_${postId}` },
                    { text: "❌ Reject", callback_data: `REJECT_${postId}` }
                ]
            ]
        };

        // Use sendPhoto to include an image along with the caption and keyboard.
        const photoUrl = images[0].url;
        const url = `${TELEGRAM_API_URL}/sendPhoto`;
        const payload = {
            chat_id: RECEIVER_TELEGRAM_CHAT_ID,
            photo: photoUrl,
            caption: text,
            parse_mode: "Markdown",
            reply_markup: JSON.stringify(inlineKeyboard)
        };

        await axios.post(url, payload, {
            headers: { "Content-Type": "application/json" }
        });
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
    let postId = null;

    // Extract postId from payload if available (for button clicks)
    if (message.payload) {
        const parts = message.payload.split("_");
        if (parts.length > 1) {
            postId = parts[1];
        }
    }

    console.log("Processing Telegram response for post:", postId);

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
    // Check if response matches HH:MM format.
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex.test(responseText)) {
        console.log("Post time input received:", responseText);
        await handlePostTimeInput(postId, responseText);
        return;
    }

    // --- Reject Flow ---
    if (responseText.startsWith("reject")) {
        // Ask for rejection feedback.
        const url = `${TELEGRAM_API_URL}/sendMessage`;
        await axios.post(url, {
            chat_id: message.from,
            text: `Please tell us why you are rejecting this post. Choose from:\n1. Image quality\n2. Content idea\n3. Post content\n\nAdditionally, feel free to provide further feedback to improve the post.`
        });
        // Update status to 'rejected'.
        await Post.findByIdAndUpdate(postId, { status: "rejected" });
        return;
    }

    // --- Feedback Flow ---
    // Expecting feedback in the format: "feedback <topic> <your feedback message>"
    if (responseText.startsWith("feedback")) {
        // Example: "feedback content the explanation is too technical"
        const parts = responseText.split(" ");
        const topic = parts[1];
        const feedback = parts.slice(2).join(" ");
        const post = await Post.findById(postId);
        if (post) {
            post.feedback = feedback;
            post.feedbackTopic = topic;
            await post.save();
            console.log(`Feedback received for post ${postId}: ${topic} - ${feedback}`);
            console.log("Invoking Post Creation With Feedback...");
            await invokePostCreationWithFeedback(postId);
        } else {
            console.log(`Post ${postId} not found.`);
        }
        return;
    }
}