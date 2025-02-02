import { Document, model, Schema } from 'mongoose';

// Define the structure of the Image subdocument
export interface IImage {
    url: string;
    name: string;
    width: number;
    height: number;
    size: number;
}

// Create the Image schema
const imageSchema = new Schema<IImage>({
    url: { type: String, required: true },
    name: { type: String, required: false },
    width: { type: Number, required: false },
    height: { type: Number, required: false },
    size: { type: Number, required: false },
}, { _id: false }); // Disable automatic _id generation for subdocuments

// Define the structure of the Post document
export interface IPost extends Document {
    title: string;
    content: string;
    imagePrompt: string;
    generatedImages: IImage[];
    status: 'pending' | 'accepted' | 'rejected' | 'scheduled' | 'posted';
    postTime?: Date;
    createdAt: Date;
    feedbackTopic?: 'idea' | 'content' | 'image';
    feedbackImprovement?: string;
}

// Create the Post schema
const postSchema = new Schema<IPost>({
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
export const Post = model<IPost>('Post', postSchema);
