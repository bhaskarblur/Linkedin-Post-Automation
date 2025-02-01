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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePostTimeInput = handlePostTimeInput;
const axios_1 = __importDefault(require("axios"));
const axios_curlirize_1 = __importDefault(require("axios-curlirize"));
const Post_1 = require("../models/Post");
// Initialize axios-curlirize with your axios instance
(0, axios_curlirize_1.default)(axios_1.default);
// Handle received time and schedule the post on LinkedIn
function handlePostTimeInput(postId_1, time_1, linkedinAccessToken_1) {
    return __awaiter(this, arguments, void 0, function* (postId, time, linkedinAccessToken, uploadMedia = true) {
        try {
            // Parse the time (e.g., 14:30 for 2:30 PM)
            const postTime = new Date();
            const [hours, minutes] = time.split(':');
            postTime.setHours(Number(hours), Number(minutes), 0, 0); // Set the time
            // Update the post with the selected time
            const post = yield Post_1.Post.findById(postId);
            if (post) {
                post.postTime = postTime; // Save the selected time
                post.status = 'accepted'; // Update status to accepted
                yield post.save();
                // Now schedule the post on LinkedIn
                return yield scheduleLinkedInPost(post, postTime, postId, linkedinAccessToken);
            }
            return false;
        }
        catch (error) {
            console.error('Error handling post time:', error);
            return false;
        }
    });
}
// Function to schedule the post on LinkedIn
function scheduleLinkedInPost(post_1, time_1, postId_1, accessToken_1) {
    return __awaiter(this, arguments, void 0, function* (post, time, postId, accessToken, uploadMedia = true) {
        var _a, _b;
        try {
            console.log('Initializing LinkedIn post scheduling...');
            const userAccessToken = accessToken == process.env.API_KEY ? process.env.LINKEDIN_ACCESS_TOKEN : accessToken;
            if (!userAccessToken) {
                throw new Error('LinkedIn access token is missing.');
            }
            // Step 1: Retrieve the Authenticated User's LinkedIn ID
            const userProfileResponse = yield axios_1.default.get('https://api.linkedin.com/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${userAccessToken}`,
                },
                timeout: 10000,
            });
            const userId = userProfileResponse.data.sub; // LinkedIn uses 'sub' for user ID
            console.log('Creating LinkedIn post...');
            let postData = {};
            // If uploadMedia is false, then we don't need to upload the image
            if (!uploadMedia) {
                postData = {
                    author: `urn:li:person:${userId}`, // The authenticated user's LinkedIn ID
                    lifecycleState: 'PUBLISHED', // Set the post to be published immediately
                    specificContent: {
                        'com.linkedin.ugc.ShareContent': {
                            shareCommentary: {
                                text: post.content, // The text content of the post
                            },
                            shareMediaCategory: 'NONE', // Indicates no media is attached
                        },
                    },
                    visibility: {
                        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC', // Set post visibility to public
                    },
                };
            }
            else {
                // Step 2: Register the Image Upload with LinkedIn
                const registerUploadResponse = yield registerUpload(userAccessToken, userId);
                const uploadUrl = registerUploadResponse.uploadUrl;
                const assetId = registerUploadResponse.asset;
                console.log('Upload URL:', uploadUrl);
                console.log('Asset ID:', assetId);
                // Step 3: Upload the Image File to LinkedIn
                const imageBuffer = yield fetch(post.generatedImages[0].url).then(res => res.arrayBuffer());
                console.log('Image Buffer:', imageBuffer);
                yield axios_1.default.put(uploadUrl, imageBuffer, {
                    headers: {
                        'Content-Type': 'image/jpeg', // Change this based on your image type
                    },
                    timeout: 10000,
                });
                // Set delay for 10 seconds
                console.log('Waiting for 5 seconds before creating the post...');
                yield new Promise(resolve => setTimeout(resolve, 5000));
                postData = {
                    author: `urn:li:person:${userId}`,
                    lifecycleState: 'PUBLISHED',
                    specificContent: {
                        'com.linkedin.ugc.ShareContent': {
                            shareCommentary: {
                                text: post.content,
                            },
                            shareMediaCategory: 'IMAGE',
                            media: [
                                {
                                    status: 'READY',
                                    description: {
                                        text: post.content,
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
            const currentTime = new Date();
            const targetTime = new Date(time);
            let postSuccess = false;
            if (targetTime <= currentTime) {
                console.log('Target time has already passed, posting immediately...');
                postSuccess = yield postToLinkedIn(postData, userAccessToken);
            }
            else {
                const delay = targetTime.getTime() - currentTime.getTime();
                console.log(`Scheduling post for ${targetTime.toLocaleString()}...`);
                // Delay the post until the scheduled time
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    postSuccess = yield postToLinkedIn(postData, userAccessToken);
                }), delay);
            }
            // Update the post status to "scheduled"
            const _post = yield Post_1.Post.findById(postId);
            if (_post) {
                _post.status = 'scheduled';
                yield _post.save();
            }
            return postSuccess;
        }
        catch (error) {
            console.error('Error scheduling LinkedIn post:', error);
            if (error.isAxiosError) {
                if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 401) {
                    console.error("Unauthorized access - Invalid or expired token.");
                }
                else {
                    console.error("Axios status:", (_b = error.response) === null || _b === void 0 ? void 0 : _b.status);
                }
            }
            else {
                console.error("An unknown error occurred:", error);
            }
            return false;
        }
    });
}
// Helper function to post to LinkedIn
function postToLinkedIn(postData, userAccessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const postResponse = yield axios_1.default.post('https://api.linkedin.com/v2/ugcPosts', postData, {
                headers: {
                    'Authorization': `Bearer ${userAccessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
            console.log('Post successfully published:', postResponse.data);
            return true;
        }
        catch (error) {
            console.error('Error posting to LinkedIn:', error);
            return false;
        }
    });
}
// Step 1: Register the upload
function registerUpload(accessToken, personId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
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
            const response = yield axios_1.default.post(url, data, { headers, timeout: 10000 });
            if (response.data && response.data.value) {
                // Extract the upload URL from the nested structure
                const uploadUrl = response.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
                    .uploadUrl;
                const assetId = response.data.value.asset; // LinkedIn returns 'asset' instead of 'mediaId'
                return { uploadUrl, asset: assetId };
            }
            else {
                throw new Error('Failed to register upload: Invalid response data.');
            }
        }
        catch (error) {
            console.error('Error registering image upload:', error);
            if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 403) {
                console.error('Access denied: Ensure the access token has the proper permissions.');
            }
            throw error;
        }
    });
}
