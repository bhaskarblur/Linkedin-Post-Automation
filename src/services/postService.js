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
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePost = savePost;
exports.getAllPosts = getAllPosts;
exports.getPostById = getPostById;
const mongoose_1 = require("mongoose");
const Post_1 = require("../models/Post");
function savePost(postData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Saving post:', postData);
            const post = new Post_1.Post(postData);
            const savedPost = yield post.save();
            console.log('Post saved:', savedPost);
            return savedPost;
        }
        catch (error) {
            console.error('Error saving post:', error);
            throw new Error('Failed to save post');
        }
    });
}
function getAllPosts() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const posts = yield Post_1.Post.find();
            return posts;
        }
        catch (error) {
            console.error('Error retrieving posts:', error);
            throw new Error('Failed to retrieve posts');
        }
    });
}
function getPostById(postId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!mongoose_1.Types.ObjectId.isValid(postId)) {
                throw new Error('Invalid post ID');
            }
            const post = yield Post_1.Post.findById(postId);
            return post;
        }
        catch (error) {
            console.error('Error retrieving post by ID:', error);
            throw new Error('Failed to retrieve post by ID');
        }
    });
}
