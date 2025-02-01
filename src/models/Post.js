"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Post = void 0;
const mongoose_1 = require("mongoose");
// Create the Image schema
const imageSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    name: { type: String, required: false },
    width: { type: Number, required: false },
    height: { type: Number, required: false },
    size: { type: Number, required: false },
}, { _id: false }); // Disable automatic _id generation for subdocuments
// Create the Post schema
const postSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    imagePrompt: { type: String, required: true },
    generatedImages: { type: [imageSchema], required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'scheduled'], default: 'pending' },
    postTime: { type: Date },
    createdAt: { type: Date, default: Date.now },
    feedbackTopic: { type: String, enum: ['idea', 'content', 'image'], required: false },
    feedbackImprovement: { type: String, required: false },
});
// Create and export the Post model
exports.Post = (0, mongoose_1.model)('Post', postSchema);
