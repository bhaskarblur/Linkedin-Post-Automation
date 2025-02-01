import { fal } from '@fal-ai/client';
import { Image } from '@fal-ai/client/endpoints';
import 'dotenv/config';
import { IImage } from '../models/Post';

// Ensure the Fal AI API key is set in the environment variables
const FAL_API_KEY = process.env.FAL_API_KEY;

if (!FAL_API_KEY) {
    throw new Error('Missing required environment variable: FAL_API_KEY');
}


// Configure the Fal AI client with the API key
fal.config({ credentials: FAL_API_KEY });

// Function to generate images based on a prompt
export async function generateImages(prompt: string, numImages: number = 1): Promise<IImage[]> {
    try {
        // Call the FLUX.1 [dev] model endpoint for text-to-image generation
        const result = await fal.subscribe('fal-ai/flux/dev', {
            input: {
                prompt: prompt,
                num_images: numImages,
                image_size: {
                    width: 1080,
                    height: 1080,
                },
                guidance_scale: 7.5,   // Controls how closely the image matches the prompt
                num_inference_steps: 40, // Number of denoising steps
            },
        });

        // Extract the URLs of the generated images
        const images: IImage[] = result.data.images.map((image: Image) => ({
            url: image.url || '',
            name: image.file_name || '',
            width: image.width || 0,
            height: image.height || 0,
            size: image.file_size || 0,
        }));

        return Promise.resolve(images);
    } catch (error) {
        console.error('Error generating images:', error);
        throw new Error('Failed to generate images');
    }
}
