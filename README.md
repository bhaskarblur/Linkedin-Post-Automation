# LinkedIn Automation Bot for Content Creation & Scheduling
This is a Node.js-based CLI automation bot that generates content ideas, creates images, and posts to LinkedIn on your behalf. It helps streamline content creation for tech professionals (SDE, System Design, AI, etc.) with minimal manual intervention. The bot also allows you to approve or reject content via WhatsApp and schedule posts on LinkedIn.

## Features
- Automated Post Idea Generation: Uses OpenAI to generate engaging LinkedIn post ideas for the tech niche (e.g., System Design, AI, etc.).
- Image Generation: Uses FAL AI API to generate images based on the idea prompts.
- WhatsApp Interaction: Sends post ideas to WhatsApp for manual approval or rejection.
- Post Scheduling: Once accepted, the bot asks for the posting time and schedules the post on LinkedIn.
- Feedback Collection: If rejected, the bot collects reasons for rejection and asks for feedback to improve the content.

## Tech Stack
- Node.js: Backend for the automation process.
- OpenAI API: Used to generate post ideas.
- FAL AI API: Used to generate images based on prompts.
- Telegram API: For manual interaction (Accept/Reject) and feedback collection.
- LinkedIn API: For scheduling posts on LinkedIn.
- MongoDB: For storing post details (e.g., title, content, image URLs, status, etc.).
- Cron Jobs: Used to schedule and automate the tasks (daily content generation).
