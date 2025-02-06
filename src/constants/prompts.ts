export const POST_IDEA_PROMPT = `  
Create engaging LinkedIn posts for software engineers with list-based content and use of emojis, avoiding repetitive title phrasing like "How We". Aim for conveying technical content with a human touch, resembling Bhaskar Kaura's style. Including various topics such as AI Engineering, Software Engineering, Scalable systems, System design, cloud engineering, security etc.

### Guidelines

1. **Title**:
   - Write a long & catchy title with a hook.
   - Use numbers or verbs in a curiosity-driven statement.
   - Avoid repetitive phrasing related to yourself.
   - Examples:
     - "Unlock 5 Hidden Benefits of Microservices Today 🔍"
     - "Transform Data Insights: 7 Innovative Ways with AI 🤖"
     - "Increase Database Efficiency With These 3 Unique Techniques 📈"

2. **Content** (List-based format with emojis):
   - **Problem Identification**:
     - Highlight significant problems software engineers face.
     - Include relatable emojis.
     - Example: "59% of cloud budgets are wasted on overprovisioning 💸"
   
   - **Solution Description**:
     - Describe the implemented solution or toolchain.
     - Use emojis for better engagement.
     - Example: "40% cost reduction using AWS Lambda auto-scaling + Prometheus 🎯"
   
   - **Impact**:
     - Highlight impact or results.
     - Example: "Auto-scaling adapts to demand seamlessly, saving resources 💡"
   
   - **Call to Action**:
     - Promote interaction with a discussion.
     - Use relevant hashtags intentionally.
     - Example: "Will serverless dominate 2025? 👇 #CloudEngineering #Serverless"

3. **Image Prompt**:
   - Style: Photorealistic rendering using PBR materials like brushed metal and carbon fiber, with dynamic angles.
   - Relevance: Ensure image relates well to the post's concept.
   - Examples:
     - "3D server farm with glowing neural networks"
     - "Isometric world of software architecture components connected to each other, Bhaskar Kaura written"
     - "Neural networks over server racks with cinematic lighting, Bhaskar Kaura branding"
   - Branding: Bhaskar Kaura's brand at the bottom-right.

4. **Output Format**: 
   - Stringified JSON (using \\n for new lines) formatted as a JSON array. Each element should be a valid JSON object: 

# Steps

1. Develop a clear title and structured list-based content.
2. Integrate list format with emojis for each content section.
3. Design image prompts following style guidelines.

# Examples

- **Title**: 
  - "Boost Your App Security with 5 Advanced Tips 🔒"
- **Content**: 
  - "- Unforeseen security gaps in web apps 🚪\\n- Implement security patches with ease 🔧\\n- Discuss the future of app security! 📢 #CyberSecurity #AppDev"
- **Image Prompt**: 
  - "Shield symbol integrated into code, showcasing security measures. Bhaskar Kaura brand bottom-right."

# Notes

- Prioritize clarity and engagement.
- Adjust examples by retaining technical precision.
`;

export const GenerateMessage = (count: number, prompt?: string) => `Generate ${count} posts for LinkedIn based on the following prompt: ${prompt ? `\n\nPrompt: ${prompt}` : ''}`;


export const NoAccessTokenMessage = `No access token found in payload.\nYou need to provide your own access token to upload the post. (We do not store your access token, it's one time use only)`;

export const WaitMessage = `Please wait while we schedule the post...`;

export const PostScheduledMessage = (postId: string) => `Post ${postId} scheduled successfully!`;

export const InvalidInputMessage = "Invalid input. Please try again.\n\nCommands:\n1. To generate a LinkedIn post type\n'/generate'(use --prompt= to generate a post with a specific prompt)\n\n2. To upload a post to LinkedIn type\n'/upload --postid=12345 --time=HH:MM(UTC) --accesstoken=YOUR_LINKEDIN_ACCESS_TOKEN'.\n\n3. To upload without image, use --no-media flag' \n\n4. To edit a post, type:\n/edit --postid=12345 --title=New Title --content=New Content";

export const AcceptMessage = (postId: string) => `You've accepted this post.\n\nTo upload it to LinkedIn, please provide the time you'd like to schedule the post (e.g., 14:30 for 2:30 PM) in UTC.\nYou would also need to provide your LinkedIn access token.\n\nCopy & Follow the format to upload the post:\n/upload --postid=${postId} --time=HH:MM --accesstoken=YOUR_LINKEDIN_ACCESS_TOKEN.\n\nIf you want to upload the post without image, use --no-media flag.`;

export const RejectMessage = (postId: string) => `Please provide feedback on why you are rejecting this post. Choose from the options below which you think is the reason:\n- Image \n- Post idea \n- Post content`;

export const FeedbackImprovementMessage = (postId: string) => `Please tell us how you would like to improve this post.\n\nCopy & Follow the format to write your improvement:\n/improve --postid=${postId} --feedback=your improvement message`;

export const RegenerateMessage = (post: any) => `
                    Regenerate the post based on the following feedbacks.
                    
                    **Guidelines for Revisions:**
                    - If the feedback is related to the *idea* (What is not good: idea), make significant changes to the entire post idea.
                    - If the feedback is about the *content* (What is not good: content), modify only the content of the post while keeping the main concept intact.
                    - If the feedback is related to the *image* (What is not good: image), revise the image to better match the content and theme, but don't change the anything else.
                
                    **Feedback Summary:**
                    - *What is not good*: ${post.feedbackTopic}  
                    - *Improvement*: ${post.feedbackImprovement}
                
                    Please ensure that the response should strictly be in stringified JSON format(Use escape character(\\n) to make new lines) and post aligns with the suggestions, maintaining the overall quality while addressing the specific concerns.
                    `;

export const MissingUploadArguements = "Please provide all the required arguments. Format:\n/upload --postid=12345 --time=HH:MM(UTC)--accesstoken=YOUR_LINKEDIN_ACCESS_TOKEN";

export const MissingImprovementArguements = "Please provide all the required arguments. Format:\n/improve --postid=12345 --feedback=your improvement message";