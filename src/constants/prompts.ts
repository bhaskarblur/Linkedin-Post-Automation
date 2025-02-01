export const POST_IDEA_PROMPT = `  
Generate technical LinkedIn posts for software engineers focusing on:  
🛠️ AI/ML Systems • 🏗️ Scalable Architecture • ☁️ Cloud Engineering  

### Rules:  
1. **Title**:  
   - Use numbers/verbs + pain point:  
   *Examples:*  
   - "3 Costly Mistakes 78% of Teams Make With Microservices"  
   - "How We Reduced API Latency by 62% Using RedisEdge"  

2. **Content** (2-3 paragraphs):  
   - **Para 1**: Problem + 2023-24 stat (*"59% of cloud budgets wasted on overprovisioning (Flexera 2024)"*)  
   - **Para 2**: Solution/Toolchain (*"We cut costs 40% using AWS Lambda auto-scaling + Prometheus monitoring"*)  
   - **Para 3**: Solution/Toolchain (*"We cut costs 40% using AWS Lambda auto-scaling + Prometheus monitoring"*)  
   - **Para 4**: CTA + Trend (*"Will serverless dominate 2025? Share your thoughts! 👇 #CloudEngineering"*)  

3. **Image Prompt**:  
   - Style: "3D tech, engaging scene with [MAIN CONCEPT] + Bhaskar Kaura's white cylindrical pod (bottom-left 10%)"  
   - Examples:  
     - *"Auto-scaling cloud modules with traffic flow arrows, Bhaskar Kaura pod, isometric view"*  
     - *"Neural network over server racks, Bhaskar Kaura pod, cinematic lighting"*  

4. **Output Format** (Strictly JSON Array or JSON Object):  
{  
  "title": "[Short Hook]",  
  "content": "### [Problem] 🚀\n[Solution]\n\n[CTA]" (3-4 paragraphs),  
  "imagePrompt": "[3D Concept] + Bhaskar Kaura pod"  
}  
`;

export const NoAccessTokenMessage = `No access token found in payload.\nYou need to provide your own access token to upload the post. (We do not store your access token, it's one time use only)`;

export const WaitMessage = `Please wait while we schedule the post...`;

export const PostScheduledMessage = (postId: string) => `Post ${postId} scheduled successfully!`;

export const InvalidInputMessage = "Invalid input. Please try again.\n\nCommands:\n1. To generate a LinkedIn post type\n'/generate'(use --prompt= to generate a post with a specific prompt)\n\n2. To upload a post to LinkedIn type\n'/upload --postId=12345 --time=14:00 --accessToken=YOUR_LINKEDIN_ACCESS_TOKEN'.\n\n3. To upload without image, use --no-media flag'";

export const AcceptMessage = (postId: string) => `You've accepted this post.\n\nTo upload it to LinkedIn, please provide the time you'd like to schedule the post (e.g., 14:30 for 2:30 PM).\nYou would also need to provide your LinkedIn access token.\n\nCopy & Follow the format to upload the post: upload --postId=${postId} --time=HH:MM --accessToken=YOUR_LINKEDIN_ACCESS_TOKEN.\n\nIf you want to upload the post without image, use --no-media flag.`;

export const RejectMessage = (postId: string) => `Please provide feedback on why you are rejecting this post. Choose from the options below which you think is the reason:\n1. Image \n2. Post idea\n3. Post content`;

export const FeedbackImprovementMessage = (postId: string) => `Please tell us how you would like to improve this post.\n\nCopy & Follow the format to write your improvement:\n  /improve --postId=${postId} --feedback=your improvement message`;

export const RegenerateMessage = (post: any) => `
                    Regenerate the post based on the following feedbacks.
                    
                    **Guidelines for Revisions:**
                    - If the feedback is related to the *idea* (What is not good: idea), make significant changes to the entire post idea.
                    - If the feedback is about the *content* (What is not good: content), modify only the content of the post while keeping the main concept intact.
                    - If the feedback is related to the *image* (What is not good: image), revise the image to better match the content and theme, but don't change the anything else.
                
                    **Feedback Summary:**
                    - *What is not good*: ${post.feedbackTopic}  
                    - *Improvement*: ${post.feedbackImprovement}
                
                    Please ensure that the post aligns with the suggestions, maintaining the overall quality while addressing the specific concerns.
                    `;

export const GenerateMessage = (count: number, prompt?: string) => `Generate ${count} posts for LinkedIn.${prompt ? `\n\nPrompt: ${prompt}` : ''}`;

export const MissingUploadArguements = "Please provide all the required arguments. Format:\n/upload --postId=12345 --time=14:00 --accessToken=YOUR_LINKEDIN_ACCESS_TOKEN";

export const MissingImprovementArguements = "Please provide all the required arguments. Format: improvement --postId=12345 --feedback=your improvement message";