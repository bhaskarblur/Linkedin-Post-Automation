import { Types } from "mongoose";
import { IPost, Post } from "../models/Post";


export async function savePost(postData: Partial<IPost>): Promise<IPost> {
    try {
        const post = new Post(postData);
        const savedPost = await post.save();
        return savedPost;
    } catch (error) {
        console.error('Error saving post:', error);
        throw new Error('Failed to save post');
    }
}

export async function getAllPosts(): Promise<IPost[]> {
    try {
        const posts = await Post.find();
        return posts;
    } catch (error) {
        console.error('Error retrieving posts:', error);
        throw new Error('Failed to retrieve posts');
    }
}

export async function getPostById(postId: string): Promise<IPost | null> {
    try {
        if (!Types.ObjectId.isValid(postId)) {
            throw new Error('Invalid post ID');
        }
        const post = await Post.findById(postId);
        return post;
    } catch (error) {
        console.error('Error retrieving post by ID:', error);
        throw new Error('Failed to retrieve post by ID');
    }
}
