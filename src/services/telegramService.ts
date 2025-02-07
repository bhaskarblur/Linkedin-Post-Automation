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
export async function sendExpiredaccesstokenMessage() {
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

export async function failedToPostMessage(postId: string, title: string) {
    await axios.post(url, {
        chat_id: RECEIVER_TELEGRAM_CHAT_ID,
        text: `Failed to post the scheduled post on LinkedIn.\nPost Id: ${postId}\nTitle: ${title}\nPlease retry.`,
        parse_mode: undefined,
    });
}

export async function postSuccessMessage(postId: string, title: string) {
    await axios.post(url, {
        chat_id: RECEIVER_TELEGRAM_CHAT_ID,
        text: `Post scheduled successfully.\nPost Id: ${postId}\nTitle: ${title}\nPlease wait for the post to be posted on LinkedIn.`,
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
        const photoUrl = images[0]?.url;
        if (photoUrl) {
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
        }


        // Before sending the full content, need to format the content, need to replace \\n and such escapse sequence with \n
        // Example: "Hello \\n World" -> "Hello \n World"
        const formattedContent = content.replace(/\\n/g, '\n');
        // Send full content separately as a text message
        const textPayload = {
            chat_id: chatId || RECEIVER_TELEGRAM_CHAT_ID,
            text: `📌 *Full Post Idea:*\n\n${formattedContent}`,
            parse_mode: "Markdown",
            reply_markup: !photoUrl ? inlineKeyboard : undefined, // If no image is sent, then set the inline keyboard to this message

        };
        await axios.post(url, textPayload);

        await axios.post(url, {
            chat_id: chatId || RECEIVER_TELEGRAM_CHAT_ID,
            text: `*Note: To edit the post, use\n/edit --postid=${postId} --title=New Title --content=New Content*`,
            parse_mode: "Markdown",
            reply_markup: !photoUrl ? inlineKeyboard : undefined, // If no image is sent, then set the inline keyboard to this message
        });
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
        const responseText = message.body?.toLowerCase();
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
        if (responseText?.toLowerCase().trim().startsWith("/generate")) {
            // Normalize different hyphen types (— vs --)
            const normalizedText = responseText.replace(/—/g, '--');

            // Extract the prompt first (everything after --prompt=)
            let prompt: string | undefined;
            // Update regex to handle both quoted and unquoted prompts
            const promptMatch = normalizedText.match(/--prompt=(?:"([^"]*)"|([^"]\S*(?:\s+[^-]\S*)*))(?:\s+--|$)/);
            if (promptMatch) {
                prompt = (promptMatch[1] || promptMatch[2])?.trim();
            }

            // Check for --no-media flag
            const noMedia = normalizedText.includes('--no-media');

            console.log("Command parameters:", {
                prompt: prompt,
                noMedia: noMedia
            });

            await axios.post(url, {
                chat_id: message.from,
                text: `Generating post: ${prompt ? `"${prompt}"` : ""} ${noMedia ? "without image" : ""}`,
            });

            await invokePostCreation(1, prompt, !noMedia, message.from);
            return;
        }
        // Receive improvement message
        if (responseText?.toLowerCase().trim().startsWith("/improve")) {
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
        if (responseText?.toLowerCase().trim().startsWith("/edit")) {
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

        // Receive manual upload message, Format: /upload --postid=12345 --time=14:00 --accesstoken=YOUR_LINKEDIN_ACCESS_TOKEN
        if (responseText?.toLowerCase().trim().startsWith("/upload")) {
            // Example: /upload --postid=12345 --time=14:00 --accesstoken=YOUR_LINKEDIN_ACCESS_TOKEN --apikey=env.API_KEY --no-media
            // --apiKey is optional, it can be used if --accesstoken is not provided
            console.log("Received upload message: ", responseText);

            // Extract values using regex
            const postIdMatch = responseText.match(/--postid=([a-fA-F0-9]{24})/);
            const timeMatch = responseText.match(/--time=(\S+)/);
            const accesstokenMatch = responseText.match(/--accesstoken=(\S+)/);
            const apiKeyMatch = responseText.match(/--apikey=(\S+)/); // Use both for accesstoken and apikey
            const noMedia = responseText.includes("--no-media");

            // Set values based on the matches
            const postId = postIdMatch ? postIdMatch[1] : null;
            const time = timeMatch ? timeMatch[1] : null;
            let accesstoken = accesstokenMatch ? accesstokenMatch[1] : null;
            const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;

            // Set useMedia based on the presence of "--no-media"
            const useMedia = !noMedia; // Invert to match logic, useMedia is true when media should be used

            console.log({ postId, time, accesstoken, apiKey, useMedia });

            if (!accesstoken && !apiKey) {
                await axios.post(url, {
                    chat_id: message.from,
                    text: NoAccessTokenMessage,
                    parse_mode: undefined,
                });
                return;
            }
            if (!accesstoken && apiKey) {
                accesstoken = apiKey;
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
                const post = await Post.findById(postId);
                if (!post) {
                    await axios.post(url, {
                        chat_id: message.from,
                        text: `Post Id: ${postId} not found.`,
                        parse_mode: undefined,
                    });
                    return;
                }
                if (post.status === "scheduled" || post.status === "posted") {
                    await axios.post(url, {
                        chat_id: message.from,
                        text: `Post Id: ${postId} already scheduled or posted.`,
                        parse_mode: undefined,
                    });
                    return;
                }
                const shouldUploadMedia = useMedia && post.generatedImages.length > 0;
                const success = await handlePostTimeInput(postId, time, accesstoken, shouldUploadMedia);
                if (!success) {
                    await failedToSchedulePostMessage();
                    return;
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

            const post = await Post.findById(postId);
            const inlineKeyboard = [
                [
                    { text: `${post?.generatedImages?.length && post.generatedImages.length > 0 ? "Image" : "Need an image"}`, callback_data: `FEEDBACK_${postId}_image` },
                    { text: "Content idea", callback_data: `FEEDBACK_${postId}_idea` },
                    { text: "Post content", callback_data: `FEEDBACK_${postId}_content` }
                ]
            ];

            // Ask for rejection feedback.
            await axios.post(url, {
                chat_id: message.from,
                text: RejectMessage(postId),
                reply_markup: JSON.stringify({
                    inline_keyboard: inlineKeyboard,
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
        console.error("Error processing Telegram response for chatId:", message.from, error);
        setTimeout(() => {
            axios.post(url, {
                chat_id: message.from,
                text: "Something went wrong. Error: " + error,
                parse_mode: undefined,
            });
        }, 1000);
        return;
    }
}