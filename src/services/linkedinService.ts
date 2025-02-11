import axios from 'axios';
import curlirize from 'axios-curlirize';
import { Post } from "../models/Post";
import { failedToPostMessage, postSuccessMessage } from './telegramService';

// Initialize axios-curlirize with your axios instance
curlirize(axios);
// Define the type for user profile response
interface LinkedInUserProfile {
    sub: string; // LinkedIn uses 'sub' instead of 'id' for user ID
}

interface LinkedInUploadResponse {
    value: {
        uploadMechanism: {
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                uploadUrl: string;
            };
        };
        asset: string; // LinkedIn returns 'asset' instead of 'mediaId'
    };
}

// Handle received time and schedule the post on LinkedIn
export async function handlePostTimeInput(postId: string, time: string, linkedinAccessToken?: string, uploadMedia: boolean = true): Promise<boolean> {
    try {
        // Parse the time (e.g., 14:30 for 2:30 PM)
        // Current UTC time
        const postTime = new Date();
        const [hours, minutes] = time.split(':');
        postTime.setHours(Number(hours), Number(minutes), 0, 0); // Set the time

        console.log('handlePostTimeInput: Post Time:', postTime);
        // Update the post with the selected time
        const post = await Post.findById(postId);
        if (post) {
            post.postTime = postTime; // Save the selected time
            post.status = 'accepted'; // Update status to accepted
            await post.save();

            // Now schedule the post on LinkedIn3
            return await scheduleLinkedInPost(post, postTime, postId, linkedinAccessToken, uploadMedia);
        }
        return false;
    } catch (error) {
        console.error('Error handling post time:', error);
        return false;
    }
}

// Function to schedule the post on LinkedIn
async function scheduleLinkedInPost(post: any, time: Date, postId: string, accessToken?: string, uploadMedia: boolean = true): Promise<boolean> {
    try {
        console.log('Initializing LinkedIn post scheduling...');
        const userAccessToken = accessToken == process.env.API_KEY ? process.env.LINKEDIN_ACCESS_TOKEN : accessToken;

        if (!userAccessToken) {
            throw new Error('LinkedIn access token is missing.');
        }

        // Step 1: Retrieve the Authenticated User's LinkedIn ID
        const userProfileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${userAccessToken}`,
            },
            timeout: 10000,
        });
        const userId = (userProfileResponse.data as LinkedInUserProfile).sub; // LinkedIn uses 'sub' for user ID
        console.log('Creating LinkedIn post...');
        let postData = {};

        // Before making payload, need to format the content, need to replace \\n and such escapse sequence with \n
        // Example: "Hello \\n World" -> "Hello \n World"
        const formattedContent = post.content.replace(/\\n/g, '\n');
        if (!uploadMedia) {
            postData = {
                author: `urn:li:person:${userId}`, // The authenticated user's LinkedIn ID
                lifecycleState: 'PUBLISHED', // Set the post to be published immediately
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: `${post.title}\n\n${formattedContent}`,
                        },
                        shareMediaCategory: 'NONE', // Indicates no media is attached
                    },
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC', // Set post visibility to public
                },
            };
        } else {
            console.log('Uploading Post image...');
            // Step 2: Register the Image Upload with LinkedIn
            const registerUploadResponse = await registerUpload(userAccessToken, userId);
            const uploadUrl = registerUploadResponse.uploadUrl;
            const assetId = registerUploadResponse.asset;

            console.log('Upload URL:', uploadUrl);
            console.log('Asset ID:', assetId);

            // Step 3: Upload the Image File to LinkedIn
            const imageBuffer = await fetch(post.generatedImages[0]?.url).then(res => res.arrayBuffer());
            console.log('Generated Image Buffer:', imageBuffer);
            await axios.put(uploadUrl, imageBuffer, {
                headers: {
                    'Content-Type': 'image/jpeg', // Change this based on your image type
                },
                timeout: 10000,
            });


            // Set delay for 5 seconds
            console.log('Waiting for 5 seconds before creating the post...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            postData = {
                author: `urn:li:person:${userId}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: `${post.title}\n\n${formattedContent}`,
                        },
                        shareMediaCategory: 'IMAGE',
                        media: [
                            {
                                status: 'READY',
                                description: {
                                    text: formattedContent,
                                },
                                media: assetId,
                                title: {
                                    text: post.title,
                                },
                            },
                        ],
                    },
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
                },
            };
        }

        // Step 6: Schedule the Post (Delay until the target time)
        // Input time is in UTC
        const targetTimeUTC = time;

        const currentTimeUTC = new Date(); // Current UTC time

        console.log('scheduleLinkedInPost: Current Time (UTC):', currentTimeUTC);
        console.log('scheduleLinkedInPost: Target Time (UTC):', targetTimeUTC);
        let postSuccess = false;
        if (targetTimeUTC <= currentTimeUTC) {
            console.log('Target time has already passed, posting immediately...');
            postSuccess = await postToLinkedIn(postData, userAccessToken);
            if (postSuccess) {
                const _post = await Post.findById(postId);
                if (_post) {
                    _post.status = 'posted';
                    await _post.save();
                }
            }
        } else {
            const delay = targetTimeUTC.getTime() - currentTimeUTC.getTime();
            console.log(`Scheduling post for ${targetTimeUTC.toLocaleString()}...`);
            postSuccess = true;
            // Delay the post until the scheduled time
            setTimeout(async () => {
                const success = await postToLinkedIn(postData, userAccessToken);
                if (!success) {
                    await failedToPostMessage(postId, post.title);
                    const _post = await Post.findById(postId);
                    if (_post) {
                        _post.status = 'accepted';
                        await _post.save();
                    }
                    return;
                }
                console.log('Post scheduled successfully');
                await postSuccessMessage(postId, post.title);
            }, delay);
        }

        // Update the post status to "scheduled"
        const _post = await Post.findById(postId);
        if (_post) {
            _post.status = 'scheduled';
            await _post.save();
        }
        if (postSuccess) {
            console.log('Post scheduled successfully');
        }
        return postSuccess;
    } catch (error: any) {
        console.error('Error scheduling LinkedIn post:', error);
        if (error.isAxiosError) {
            if (error.response?.status === 401) {
                console.error("Unauthorized access - Invalid or expired token.");
            } else {
                console.error("Axios status:", error.response?.status);
            }
        } else {
            console.error("An unknown error occurred:", error);
        }
        return false;
    }
}

// Helper function to post to LinkedIn
async function postToLinkedIn(postData: any, userAccessToken: string): Promise<boolean> {
    try {
        const postResponse = await axios.post('https://api.linkedin.com/v2/ugcPosts', postData, {
            headers: {
                'Authorization': `Bearer ${userAccessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        console.log('Post successfully published:', postResponse.data);
        return true;
    } catch (error) {
        console.error('Error posting to LinkedIn:', error);
        return false;
    }
}
// Step 1: Register the upload
async function registerUpload(accessToken: string, personId: string) {
    const url = 'https://api.linkedin.com/v2/assets?action=registerUpload';
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
    };

    const data = {
        registerUploadRequest: {
            owner: `urn:li:person:${personId}`,
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'], // Specify the recipe for feed share
            serviceRelationships: [
                {
                    relationshipType: 'OWNER',
                    identifier: 'urn:li:userGeneratedContent',
                },
            ],
        },
    };

    try {
        const response = await axios.post(url, data, { headers, timeout: 10000 });
        if (response.data && (response.data as LinkedInUploadResponse).value) {
            // Extract the upload URL from the nested structure
            const uploadUrl =
                (response.data as LinkedInUploadResponse).value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
                    .uploadUrl;
            const assetId = (response.data as LinkedInUploadResponse).value.asset; // LinkedIn returns 'asset' instead of 'mediaId'
            return { uploadUrl, asset: assetId };
        } else {
            throw new Error('Failed to register upload: Invalid response data.');
        }
    } catch (error) {
        console.error('Error registering image upload:', error);
        if ((error as any).response?.status === 403) {
            console.error('Access denied: Ensure the access token has the proper permissions.');
        }
        throw error;
    }
}