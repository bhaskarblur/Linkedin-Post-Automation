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
exports.generateImages = generateImages;
const client_1 = require("@fal-ai/client");
require("dotenv/config");
// Ensure the Fal AI API key is set in the environment variables
const FAL_API_KEY = process.env.FAL_API_KEY;
if (!FAL_API_KEY) {
    throw new Error('Missing required environment variable: FAL_API_KEY');
}
// Configure the Fal AI client with the API key
client_1.fal.config({ credentials: FAL_API_KEY });
// Function to generate images based on a prompt
function generateImages(prompt_1) {
    return __awaiter(this, arguments, void 0, function* (prompt, numImages = 1) {
        try {
            console.log('Generating images for prompt:', prompt);
            // Call the FLUX.1 [dev] model endpoint for text-to-image generation
            const result = yield client_1.fal.subscribe('fal-ai/flux/dev', {
                input: {
                    prompt: prompt,
                    num_images: numImages,
                    image_size: {
                        width: 1080,
                        height: 1080,
                    },
                    guidance_scale: 7.5, // Controls how closely the image matches the prompt
                    num_inference_steps: 40, // Number of denoising steps
                },
            });
            console.log('Images generated successfully:', result.data.images);
            console.log('File content type:', result.data.images[0].content_type);
            // Extract the URLs of the generated images
            const images = result.data.images.map((image) => ({
                url: image.url || '',
                name: image.file_name || '',
                width: image.width || 0,
                height: image.height || 0,
                size: image.file_size || 0,
            }));
            console.log('Images:', images);
            return Promise.resolve(images);
        }
        catch (error) {
            console.error('Error generating images:', error);
            throw new Error('Failed to generate images');
        }
    });
}
