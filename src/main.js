"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invokePostCreation = invokePostCreation;
exports.invokePostCreationWithFeedback = invokePostCreationWithFeedback;
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const node_cron_1 = __importDefault(require("node-cron"));
const Post_1 = require("./models/Post");
const contentService_1 = require("./services/contentService");
const imageService_1 = require("./services/imageService");
const postService_1 = require("./services/postService");
const telegramService_1 = require("./services/telegramService");
node_cron_1.default.schedule('0 0 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('CRON: Running LinkedIn Automation Bot...');
    invokePostCreation(2);
}));
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
function invokePostCreation(ideaCount, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Invoking Post Creation...');
            const posts = yield (0, contentService_1.generatePostIdeas)(ideaCount, prompt);
            for (const post of posts) {
                console.log('Starting to generate images for post:', post.title);
                const images = yield (0, imageService_1.generateImages)(post.imagePrompt, Number(process.env.DEFAULT_POST_IMAGE_COUNT) || 1);
                const savedPost = yield (0, postService_1.savePost)(Object.assign(Object.assign({}, post), { generatedImages: images }));
                yield (0, telegramService_1.sendTelegramMessage)(post.title, post.content, images, savedPost.id);
            }
        }
        catch (error) {
            console.error('Error invoking post creation:', error);
        }
    });
}
function invokePostCreationWithFeedback(postId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const postDetails = yield Post_1.Post.findById(postId);
            if (!postDetails) {
                throw new Error('Post not found');
            }
            const newPost = yield (0, contentService_1.generatePostWithFeedback)(postDetails);
            if (newPost) {
                if (postDetails.feedbackTopic == 'image' || postDetails.feedbackTopic == 'idea') {
                    console.log('Generating Images...');
                    const images = yield (0, imageService_1.generateImages)(newPost.imagePrompt, Number(process.env.DEFAULT_POST_IMAGE_COUNT) || 1);
                    postDetails.generatedImages = images;
                }
                // Update the post accordingly
                if (postDetails.feedbackTopic === 'idea') {
                    postDetails.title = newPost.title;
                    postDetails.content = newPost.content;
                    postDetails.imagePrompt = newPost.imagePrompt;
                }
                else if (postDetails.feedbackTopic === 'content') {
                    postDetails.content = newPost.content;
                }
                else if (postDetails.feedbackTopic === 'image') {
                    postDetails.imagePrompt = newPost.imagePrompt;
                }
                yield postDetails.save();
                yield (0, telegramService_1.sendTelegramMessage)(newPost.title, newPost.content, postDetails.generatedImages, postDetails.id);
            }
        }
        catch (error) {
            console.error('Error invoking post creation with feedback:', error);
        }
    });
}
app.get('/', (req, res) => {
    res.send('Server is running');
});
app.get('/generate', (req, res) => {
    // Header validation with x-api-key
    const apiKey = req.headers['x-api-key'];
    const prompt = req.query.prompt;
    if (apiKey !== process.env.API_KEY) {
        res.status(401).json({ message: 'Please provide a valid API key' });
        return;
    }
    const ideaCount = req.query.count ? parseInt(req.query.count) : 2;
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
app.post('/webhook/telegram', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = req.body;
        console.log("Received Telegram update:\n", JSON.stringify(body, null, 2));
        let messageData = {};
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
        yield (0, telegramService_1.processTelegramResponse)(messageData);
        res.status(200).send({ status: "Message processed" });
    }
    catch (error) {
        console.error("Error processing Telegram update:", error);
        res.status(500).send({ error: "Internal server error" });
    }
}));
mongoose_1.default.connect(process.env.MONGODB_URI || '')
    .then(() => console.log('MongoDB connected successfully'))
    .catch((error) => console.error('MongoDB connection error:', error));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
