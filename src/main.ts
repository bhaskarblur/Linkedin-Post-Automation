import bodyParser from 'body-parser';
import express from 'express';
import cron from 'node-cron';
import { generatePostIdeas } from './services/contentService';
import { generateImages } from './services/imageService';
import { savePost } from './services/postService';
import { sendWhatsAppMessage } from './services/whatsappService';

cron.schedule('0 0 * * *', async () => {
    console.log('Running LinkedIn Automation Bot...');
    const posts = await generatePostIdeas(2);
    for (const post of posts) {
        const images = await generateImages(post.imagePrompt, Number(process.env.POST_IMAGE_COUNT) || 1);
        await savePost({ ...post, generatedImages: images });
        await sendWhatsAppMessage(post.title, post.content, images, post.id);
    }
});

const app = express();
app.use(bodyParser.json());




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));