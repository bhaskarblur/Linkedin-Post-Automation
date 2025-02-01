import { Post } from "../models/Post";


// Handle received time and schedule the post on LinkedIn
export async function handlePostTimeInput(postId: string, time: string) {
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
            await scheduleLinkedInPost(post, postId);
        }
    } catch (error) {
        console.error('Error handling post time:', error);
    }
}

// Function to schedule the post on LinkedIn
async function scheduleLinkedInPost(post: any, postId: string) {
    try {
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
                'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
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
    } catch (error) {
        console.error('Error scheduling post on LinkedIn:', error);
    }
}
