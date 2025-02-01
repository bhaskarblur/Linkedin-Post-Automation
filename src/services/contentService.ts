import 'dotenv/config';
import { OpenAI } from 'openai';
import { Post } from '../models/Post';

// Define the structure of a post idea
interface PostIdea {
    title: string;
    content: string;
    imagePrompt: string;
}

// Ensure the OpenAI API key is set in the environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    throw new Error('Missing required environment variable: OPENAI_API_KEY');
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

// Function to generate post ideas using GPT-4o
export async function generatePostIdeas(ideasCount: number): Promise<PostIdea[]> {
    try {
        // Define the prompt for generating post ideas
        const prompt = `
            I am a Software Engineer specializing in Backend, System Design, and AI, and a tech enthusiast interested in the latest trends.
            You will be asked to generat LinkedIn post ideas & content related to System Design, AI, and the latest tech trends.
            Use English for the post ideas and content, image prompt.
            For image generate prompt guidelines, the image should be a tech related representation of the post in English, it can be a logo, a diagram, a screenshot, etc.
            The image should contain my name on any corner(Bhaskar Kaura), images/diagrams must be clean and simple, use max 2 colors(green and blue).
            Each idea should include:
            - A catchy title
            - Detailed post content (Engaging, 2-3 paragraphs)
            - A well-explained and detailed prompt for generating a related image

            Return the response as a JSON array of objects with the following keys:
            - title
            - content
            - imagePrompt
        `;

        // Call the OpenAI API with the GPT-4o model
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Specify the GPT-4o model
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: 'Generate ${ideasCount} post ideas for LinkedIn about System Design, AI, and latest tech trends.' },
            ],
            max_tokens: 3600, // Adjust based on API limits
            temperature: 0.7, // Controls creativity
            n: 1, // Number of completions to generate
        });

        // Parse the JSON response
        const ideas: PostIdea[] = JSON.parse(response.choices[0].message?.content || '[]');
        console.log('ideas', ideas);
        return ideas;
    } catch (error) {
        console.error('Error generating post ideas:', error);
        throw new Error('Failed to generate post ideas');
    }
}

export async function generatePostWithFeedback(postId: string): Promise<PostIdea | null> {
    try {
        const post = await Post.findById(postId);
        if (!post) {
            throw new Error('Post not found');
        }
        // Define the prompt for generating post ideas
        const prompt = `
          I am a Software Engineer specializing in Backend, System Design, and AI, and a tech enthusiast interested in the latest trends.
          You will be asked to generat LinkedIn post ideas & content related to System Design, AI, and the latest tech trends.
          Use English for the post ideas and content, image prompt.
          For image generate prompt guidelines, the image should be a tech related representation of the post in English, it can be a logo, a diagram, a screenshot, etc.
          The image should contain my name on any corner(Bhaskar Kaura), images/diagrams must be clean and simple, use max 2 colors(green and blue).
          Each idea should include:
          - A catchy title
          - Detailed post content (Engaging, 2-3 paragraphs)
          - A well-explained and detailed prompt for generating a related image

          Return the response as a JSON array of objects with the following keys:
          - title
          - content
          - imagePrompt
      `;

        // Call the OpenAI API with the GPT-4o model
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Specify the GPT-4o model
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: 'Generate post idea for LinkedIn about System Design, AI, and latest tech trends.' },
                {
                    role: 'assistant', content:
                        `title: ${post.title}
                    content: ${post.content}
                    imagePrompt: ${post.imagePrompt},
                    `
                },
                {
                    role: 'user', content:
                        `What is not good: ${post.feedbackTopic}\n
                        What to do: ${post.feedback}`
                },
            ],
            max_tokens: 3600, // Adjust based on API limits
            temperature: 0.7, // Controls creativity
            n: 1, // Number of completions to generate
        });

        // Parse the JSON response
        const idea: PostIdea = JSON.parse(response.choices[0].message?.content || '{}');
        // Update the post with the new idea
        post.title = idea.title;
        post.content = idea.content;
        post.imagePrompt = idea.imagePrompt;
        await post.save();
        console.log('idea', idea);
        return idea;
    } catch (error) {
        console.error('Error generating post with feedback:', error);
        throw new Error('Failed to generate post with feedback');
    }
}