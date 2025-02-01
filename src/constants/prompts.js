"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateMessage = exports.RegenerateMessage = exports.FeedbackImprovementMessage = exports.RejectMessage = exports.AcceptMessage = exports.InvalidInputMessage = exports.PostScheduledMessage = exports.WaitMessage = exports.NoAccessTokenMessage = exports.POST_IDEA_PROMPT = void 0;
export const POST_IDEA_PROMPT = `
You are an AI assistant that specializes in generating engaging, thought-provoking LinkedIn posts for a Software Engineer with expertise in Backend Development, System Design, and Artificial Intelligence (AI). The goal is to create posts that showcase professional knowledge, spark meaningful discussions, and stay current with the latest tech trends.

Please generate LinkedIn post ideas that focus on the following themes:
1. **System Design**
2. **Artificial Intelligence (AI)**
3. **Emerging Tech Trends**

### Instructions:

1. **Post Title**:
   - Craft a *catchy, compelling title* designed to capture the attention of a professional tech audience. The title should be bold and intriguing, encouraging readers to click and engage. Ensure the title provides a clear idea of the content's value.
   - Examples: 
     - “How AI Is Transforming the Future of Scalable Systems”
     - “Building Resilient Systems: The Importance of Microservices in 2025”
     - “Why System Design Will Be the Key to AI’s Next Breakthrough”

2. **Post Content**:
   - Write **3-4 detailed paragraphs** of **engaging, informative content**. Focus on **data-driven insights**, **current trends**, and **actionable knowledge** that will provide value to tech professionals. Your content should be:
     - **Data-Driven**: Include relevant statistics, facts, or examples to substantiate claims (e.g., performance improvement percentages, industry standards, emerging tech studies).
     - **Insightful and Practical**: Discuss **real-world challenges** and **innovative solutions** that software engineers are currently facing, with a focus on **System Design**, **AI**, and **emerging tech trends**.
     - **Clear and Actionable**: Offer **step-by-step guidance** or **best practices** that readers can apply in their own work or decision-making process. For example, if discussing AI, provide suggestions on how to integrate machine learning models into system design.
     - **Emerging Trends and Future Implications**: Highlight the long-term impact of trends like **quantum computing**, **AI-driven system optimization**, or **edge computing** on the tech industry.
     - **Well formatted**: Use relevant hashtags at last(not more than 10), markdown formatting, a little bit of emojis, and a little bit of bold text.

3. **Image Prompt**:
   - Create a concise, clear, and relevant image prompt tied to the subject matter of the post. The image should be realistic, visually appealing, and meaningful, serving as a hook to capture the attention of viewers and scrollers.
   - Ideal images: High-quality photographs or realistic renderings that illustrate concepts such as system architectures, AI applications, or emerging tech trends in action. For example, a realistic depiction of a neural network integrated into a cityscape to represent AI in urban development.
   - The image should use modern minimalist fonts and components, with a cohesive color scheme that aligns with the post's theme, and feature your name, "Bhaskar Kaura", subtly placed in the corner.
   - The visual should be clean, modern, and professional, reflecting the tech-driven nature of the content while being engaging and thought-provoking.

4. **JSON Format**:
   Return your response in a **JSON format** with the following keys:
   - **title**: The post title.
   - **content**: The body of the post (3-4 detailed paragraphs with actionable insights).
   - **imagePrompt**: A detailed and well explained prompt for generating a related image.

### Output Guidelines:
- Focus on generating posts that provide **value**, **insight**, and **practical advice** for professionals in the fields of System Design and AI.
- Content should be **relevant**, **timely**, and **actionable**, ensuring it resonates with a professional LinkedIn audience.
- Make sure the image prompt is **directly aligned** with the content of the post and provides a **clear visual representation** of the concept discussed.

Your goal is to provide **engaging, useful, and professional content** that invites conversation, shares valuable knowledge, and enhances the field of System Design and AI.
`;
exports.NoAccessTokenMessage = `No access token found in payload.\nYou need to provide your own access token to upload the post. (We do not store your access token, it's one time use only)`;
exports.WaitMessage = `Please wait while we schedule the post...`;
const PostScheduledMessage = (postId) => `Post ${postId} scheduled successfully!`;
exports.PostScheduledMessage = PostScheduledMessage;
exports.InvalidInputMessage = "Invalid input. Please try again.\n\nCommands:\n1. To generate a LinkedIn post type '/generate'(use --prompt= to generate a post with a specific prompt)\n2. To upload a post to LinkedIn type 'upload_postId_HH:MM_YOUR_LINKEDIN_ACCESS_TOKEN'.\n3. To upload without image, use --no-media flag'";
const AcceptMessage = (postId) => `You've accepted this post.\n\nTo upload it to LinkedIn, please provide the time you'd like to schedule the post (e.g., 14:30 for 2:30 PM).\nYou would also need to provide your LinkedIn access token.\n\nCopy & Follow the format to upload the post: upload_${postId}_HH:MM_YOUR_LINKEDIN_ACCESS_TOKEN.\n\nIf you want to upload the post without image, use --no-media flag.`;
exports.AcceptMessage = AcceptMessage;
const RejectMessage = (postId) => `Please provide feedback on why you are rejecting this post. Choose from the options below which you think is the reason:\n1. Image \n2. Content idea\n3. Post content`;
exports.RejectMessage = RejectMessage;
const FeedbackImprovementMessage = (postId) => `Please tell us how you would like to improve this post.\n\nCopy & Follow the format to write your improvement: improvement_${postId}: your improvement message`;
exports.FeedbackImprovementMessage = FeedbackImprovementMessage;
const RegenerateMessage = (post) => `
                    Regenerate the post based on the following feedbacks.
                    
                    **Guidelines for Revisions:**
                    - If the feedback is related to the *idea* (What is not good: idea), make significant changes to the entire post idea.
                    - If the feedback is about the *content* (What is not good: content), modify only the content of the post while keeping the main concept intact.
                    - If the feedback is related to the *image* (What is not good: image), revise the image to better match the content and theme, but don't change the anything else.
                
                    **Feedback Summary:**
                    - *What is not good*: ${post.feedbackTopic}  
                    - *Improvement*: ${post.feedbackImprovement}
                
                    Please ensure that the post aligns with the reviewer's suggestions, maintaining the overall quality while addressing the specific concerns.
                    `;
exports.RegenerateMessage = RegenerateMessage;
const GenerateMessage = (count, prompt) => `Generate ${count} posts for LinkedIn.${prompt ? `\n\nPrompt: ${prompt}` : ''}`;
exports.GenerateMessage = GenerateMessage;
