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
    name: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    size: { type: Number, required: true },
}, { _id: false }); // Disable automatic _id generation for subdocuments

// Define the structure of the Post document
export interface IPost extends Document {
    title: string;
    content: string;
    imagePrompt: string;
    generatedImages: IImage[];
    status: 'pending' | 'accepted' | 'rejected' | 'scheduled';
    postTime?: Date;
    createdAt: Date;
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
});

// Create and export the Post model
export const Post = model<IPost>('Post', postSchema);
