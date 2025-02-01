import axios from 'axios';
import { Post } from "../models/Post";


// Handle received time and schedule the post on LinkedIn
export async function handlePostTimeInput(postId: string, time: string, linkedinAccessToken?: string): Promise<boolean> {
    try {
        // Parse the time (e.g., 14:30 for 2:30 PM)
        const postTime = new Date();
        const [hours, minutes] = time.split(':');
        postTime.setHours(Number(hours), Number(minutes), 0, 0); // Set the time

        // Update the post with the selected time
        const post = await Post.findById(postId);
        if (post) {
            post.postTime = postTime; // Save the selected time
            post.status = 'accepted'; // Update status to accepted
            await post.save();

            // Now schedule the post on LinkedIn
            return await scheduleLinkedInPost(post, postId, linkedinAccessToken);
        }
        return false;
    } catch (error) {
        console.error('Error handling post time:', error);
        return false;
    }
}

// Function to schedule the post on LinkedIn
async function scheduleLinkedInPost(post: any, postId: string, accessToken?: string): Promise<boolean> {
    try {
        const userAccessToken = accessToken == process.env.API_KEY ? process.env.LINKEDIN_ACCESS_TOKEN : accessToken;
        const postData = {
            content: {
                title: post.title,
                description: post.content,
                media: [
                    {
                        mediaUrl: post.generatedImages[0].url // First image
                    }
                ]
            },
            postTime: post.postTime // Scheduled time
        };

        // LinkedIn API endpoint for scheduling posts (example)
        const LINKEDIN_API_URL = 'https://api.linkedin.com/v2/ugcPosts';

        // Prepare the LinkedIn API request
        const response = await axios.post(LINKEDIN_API_URL, postData, {
            headers: {
                'Authorization': `Bearer ${userAccessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Post scheduled on LinkedIn:', response.data);
        // Save the post with status "pending" and await the time input.
        const _post = await Post.findById(postId);
        if (_post) {
            _post.status = 'scheduled'; // Change the status to pending
            await _post.save();
        }
        return true;
    } catch (error: unknown) {
        // Narrow the type manually
        if ((error as any).isAxiosError) {
            const axiosError = error as { response?: { status: number } };
            if (axiosError.response?.status === 401) {
                console.error("Unauthorized access - Invalid or expired token.");
            } else {
                console.error("Axios status:", axiosError.response?.status);
            }
        } else {
            console.error("An unknown error occurred:", error);
        }
    }
    return false;
}
