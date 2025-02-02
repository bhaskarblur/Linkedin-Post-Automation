import axios from "axios";
import { AcceptMessage, FeedbackImprovementMessage, InvalidInputMessage, MissingImprovementArguements, MissingUploadArguements, NoAccessTokenMessage, PostScheduledMessage, RejectMessage, WaitMessage } from "../constants/prompts";
import { invokePostCreation, invokePostCreationWithFeedback } from "../main";
import { IImage, Post } from "../models/Post"; // Your Post model
import { handlePostTimeInput } from "./linkedinService";

// Construct the Telegram API base URL
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
export const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const RECEIVER_TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const url = `${TELEGRAM_API_URL}/sendMessage`;

// This caters admin only access token expiry, so no chat id is required.
export async function sendExpiredAccessTokenMessage() {
    await axios.post(url, {
        chat_id: RECEIVER_TELEGRAM_CHAT_ID,
        text: "Your access token has expired. Please update your access token on server.",
        parse_mode: undefined,
    });
}

export async function failedToSchedulePostMessage() {
    await axios.post(url, {
        chat_id: RECEIVER_TELEGRAM_CHAT_ID,
        text: "Failed to schedule post on LinkedIn.\nPlease make sure you've passed the correct post id and LinkedIn access token.",
        parse_mode: undefined,
    });
}

export async function failedToGenerateImagesMessage(errorMessage: string, chatId?: string) {
    await axios.post(url, {
        chat_id: chatId || RECEIVER_TELEGRAM_CHAT_ID,
        text: `Failed to make the post for LinkedIn.\nError: ${errorMessage}\n\nPlease try again.`,
        parse_mode: undefined,
    });
}

export async function failedToGeneratePostWithFeedbackMessage(errorMessage: string, chatId?: string) {
    await axios.post(url, {
        chat_id: chatId || RECEIVER_TELEGRAM_CHAT_ID,
        text: `Failed to generate post with feedback.\nError: ${errorMessage}\n\nPlease try again.`,
        parse_mode: undefined,
    });
}
/**
 * Send a Telegram message with inline keyboard buttons for Accept/Reject.
 * @param title The post title.
 * @param content The post content.
 * @param images Array of generated images.
 * @param postId The database post ID.
 */
export async function sendTelegramMessage(title: string, content: string, images: IImage[], postId: string, chatId?: string) {
    try {
        console.log('Sending Telegram Message...');
        const text = `📌 *Post Idea:*\n\n${title}\n\n${content}`;
        const maxCaptionLength = 1024;

        const inlineKeyboard = {
            inline_keyboard: [
                [
                    { text: "✅ Approve & Upload", callback_data: `ACCEPT_${postId}` },
                    { text: "❌ Decline & Regenerate", callback_data: `REJECT_${postId}` },
                ]
            ]
        };

        console.log("Sending Telegram message with post:", title);
        // Use sendPhoto to include an image with a truncated caption
        const photoUrl = images[0].url;
        const photoPayload = {
            chat_id: chatId || RECEIVER_TELEGRAM_CHAT_ID,
            photo: photoUrl,
            text: "Generated Post Image",
            caption: `Title: ${title}\n\n🚀 Full post content below`,
            parse_mode: "Markdown",
            reply_markup: inlineKeyboard,
        };

        // Send the image first
        await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, photoPayload);

        console.log("Telegram post photo sent successfully.");
        // Send full content separately as a text message
        if (text.length > maxCaptionLength) {
            const textPayload = {
                chat_id: chatId || RECEIVER_TELEGRAM_CHAT_ID,
                text: `📌 *Full Post Idea:*\n\n${content}\n\n*Note: To edit the post, use\n/edit --postid=${postId} --title=New Title --content=New Content*`,
                parse_mode: "Markdown",

            };
            await axios.post(url, textPayload);
        }


    } catch (error) {
        console.error("Error sending Telegram message:", error);
        // Retry sending the message
        return await sendTelegramMessage(title, content, images, postId, chatId);
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
    try {
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

        // Generate post
        if (responseText.toLowerCase().trim().startsWith("/generate")) {
            // Example: /generate --prompt=Generate a post about the future of AI
            console.log("Generating post...");
            const prompt = responseText.split("--prompt=")[1];
            if (!prompt) {
                console.error("Prompt is empty.");
            }
            console.log("/generate --prompt:", prompt);
            await axios.post(url, {
                chat_id: message.from,
                text: "Generating a LinkedIn post for you! Please wait...",
                parse_mode: undefined,
            });
            await invokePostCreation(1, prompt, message.from); // Create 1 post
            return;
        }
        // Receive improvement message
        if (responseText.toLowerCase().trim().startsWith("/improve")) {
            // Example: /improve --postid=12345 --reason=image --feedback=
            // -- reason is optional, feedback is required
            console.log("Received improvement message: ", responseText);

            // Extract postId
            const postIdMatch = responseText.match(/--postid=([a-fA-F0-9]{24})/);
            const postId = postIdMatch ? postIdMatch[1] : null;

            // Extract reason (optional)
            const reasonMatch = responseText.match(/--reason=([\w\s]+)/);
            const reason = reasonMatch ? reasonMatch[1] : null;

            // Extract feedback (required)
            const feedbackMatch = responseText.match(/--feedback=(.+)/);
            const improvementMessage = feedbackMatch ? feedbackMatch[1].trim() : null;

            if (!postId || !improvementMessage) {
                console.error("Improvement message is empty.");
                await axios.post(url, {
                    chat_id: message.from,
                    text: MissingImprovementArguements,
                    parse_mode: undefined,
                });
                return;
            }
            await axios.post(url, {
                chat_id: message.from,
                text: `Thank you! We're applying the changes to the post.\nPlease wait while we apply the changes to the post.`,
                parse_mode: "Markdown",
            });
            const post = await Post.findById(postId);
            if (post) {
                post.feedbackImprovement = improvementMessage;
                if (reason && reason.trim() !== "") {
                    post.feedbackTopic = reason.trim();
                }
                await post.save();
            }
            await invokePostCreationWithFeedback(postId, message.from);
            return;
        }

        // Editing a post
        if (responseText.toLowerCase().trim().startsWith("/edit")) {
            // Example: /edit --postid=12345 --title=New Title --content=New Content is here...
            // --title and --content are optional, so we need to check if they are present

            // Regex to capture parameters dynamically
            const postIdMatch = responseText.match(/--postid=([a-fA-F0-9]{24})/);
            const titleMatch = responseText.match(/--title=([^\n\r-]+)/);
            const contentMatch = responseText.match(/--content=(.+)/);

            const postId = postIdMatch ? postIdMatch[1].trim() : null;
            const title = titleMatch ? titleMatch[1].trim() : null;
            const content = contentMatch ? contentMatch[1].trim() : null;

            console.log({ postId, title, content });
            if (!postId) {
                await axios.post(url, {
                    chat_id: message.from,
                    text: "Please provide a valid postId.",
                    parse_mode: undefined,
                });
                return;
            }
            if (!title && !content) {
                await axios.post(url, {
                    chat_id: message.from,
                    text: "Please provide atleast one valid title or content.",
                    parse_mode: undefined,
                });
                return;
            }
            await axios.post(url, {
                chat_id: message.from,
                text: "Editing post...",
                parse_mode: undefined,
            });
            const post = await Post.findById(postId);
            if (post) {
                if (title) {
                    post.title = title.charAt(0).toUpperCase() + title.slice(1);
                }
                if (content) {
                    post.content = content;
                }
                await post.save();
                await axios.post(url, {
                    chat_id: message.from,
                    text: "Post edited successfully! Below is the updated post:",
                    parse_mode: undefined,
                });
                await sendTelegramMessage(post.title, post.content, post.generatedImages, post.id, message.from);
            }
            return;
        }

        // Receive manual upload message, Format: /upload --postid=12345 --time=14:00 --accessToken=YOUR_LINKEDIN_ACCESS_TOKEN
        if (responseText.toLowerCase().trim().startsWith("/upload")) {
            // Example: /upload --postid=12345 --time=14:00 --accessToken=YOUR_LINKEDIN_ACCESS_TOKEN --apiKey=env.API_KEY --no-media
            // --apiKey is optional, it can be used if --accessToken is not provided
            console.log("Received upload message: ", responseText);

            // Extract values using regex
            const postIdMatch = responseText.match(/--postid=([a-fA-F0-9]{24})/);
            const timeMatch = responseText.match(/--time=(\S+)/);
            const accessTokenMatch = responseText.match(/--accessToken=(\S+)/);
            const apiKeyMatch = responseText.match(/--apikey=(\S+)/); // Use both for accessToken and apiKey
            const noMedia = responseText.includes("--no-media");

            // Set values based on the matches
            const postId = postIdMatch ? postIdMatch[1] : null;
            const time = timeMatch ? timeMatch[1] : null;
            let accessToken = accessTokenMatch ? accessTokenMatch[1] : null;
            const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;

            // Set useMedia based on the presence of "--no-media"
            const useMedia = !noMedia; // Invert to match logic, useMedia is true when media should be used

            console.log({ postId, time, accessToken, apiKey, useMedia });

            if (!accessToken && !apiKey) {
                await axios.post(url, {
                    chat_id: message.from,
                    text: NoAccessTokenMessage,
                    parse_mode: undefined,
                });
                return;
            }
            if (!accessToken && apiKey) {
                accessToken = apiKey;
            }
            if (!time || !postId) {
                await axios.post(url, {
                    chat_id: message.from,
                    text: MissingUploadArguements,
                    parse_mode: undefined,
                });
                return;
            }
            if (postId) {
                console.log('Scheduling post...');
                await axios.post(url, {
                    chat_id: message.from,
                    text: WaitMessage,
                    parse_mode: undefined,
                });
                const success = await handlePostTimeInput(postId, time, accessToken, useMedia);
                if (!success) {
                    await failedToSchedulePostMessage();
                }
                await axios.post(url, {
                    chat_id: message.from,
                    text: PostScheduledMessage(postId),
                    parse_mode: undefined,
                });
            }
            return;
        }


        if (!postId) {
            console.error("No postId found in payload.");
            // Fallback message
            await axios.post(url, {
                chat_id: message.from,
                text: InvalidInputMessage,
                parse_mode: undefined,
            });
            return;
        }

        // --- Accept Flow ---
        if (responseText.startsWith("accept")) {
            // Ask for the time to schedule the post.
            await axios.post(url, {
                chat_id: message.from,
                text: AcceptMessage(postId),
                parse_mode: undefined,
            });
            // Update post status to 'pending'
            await Post.findByIdAndUpdate(postId, { status: "accepted" });
            return;
        }


        // --- Reject Flow ---
        if (responseText.startsWith("reject")) {
            // Ask for rejection feedback.
            await axios.post(url, {
                chat_id: message.from,
                text: RejectMessage(postId),
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [
                            { text: "1. Image", callback_data: `FEEDBACK_${postId}_image` },
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
            // Example: feedback --postId=12345 --topic=image
            const topic = message.payload.split("_")[2];
            const post = await Post.findById(postId);
            if (post) {
                post.feedbackTopic = topic;
                await post.save();
                console.log(`Feedback type received for post ${postId}: ${topic}`);

                // Ask for improvement.
                await axios.post(url, {
                    chat_id: message.from,
                    text: FeedbackImprovementMessage(postId),
                    parse_mode: undefined,
                });
            }

            return;
        } else {
            console.log(`Post ${postId} not found.`);
        }

        return;
    } catch (error) {
        console.error("Error processing Telegram response:", error);
        await axios.post(url, {
            chat_id: message.from,
            text: "Something went wrong. Error: " + error,
            parse_mode: undefined,
        });
    }
}