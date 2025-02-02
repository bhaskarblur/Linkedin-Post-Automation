# LinkedIn Automation Bot for Content Creation & Scheduling
This is a Node.js-based CLI automation bot that generates content ideas, creates images, and posts to LinkedIn on your behalf. It helps streamline content creation for tech professionals (SDE, System Design, AI, etc.) with minimal manual intervention. The bot also allows you to approve or reject content via Telegram bot and schedule posts on LinkedIn.

## Features
- Automated Post Idea Generation: Uses OpenAI to generate engaging LinkedIn post ideas for the tech niche (e.g., System Design, AI, etc.).
- Image Generation: Uses FAL AI API to generate images based on the idea prompts.
- Telegram Interaction: Sends post ideas to Telegram bot for manual approval or rejection.
- Post Scheduling: Once accepted, the bot asks for the posting time and schedules the post on LinkedIn.
- Feedback Collection: If rejected, the bot collects reasons for rejection and asks for feedback to improve the content.

# Prerequisites
- Node.js
- MongoDB
- A Telegram Bot Token
- Default Telegram Chat ID
- A LinkedIn Access Token for the LinkedIn Account
- FAL AI API Key
- OpenAI API Key

# How to run
- Clone the repository
- Run `npm install` to install the dependencies
- Run `npm start` to start the application
- Send the message `/generate` to the bot to generate post ideas.
- Alternatively you can make a GET HTTP Request to `/generate` to generate post ideas.
- A Cron Job is set to automatically generate post ideas at 12:00 AM midnight.

## Tech Stack
- Node.js: Backend for the automation process.
- OpenAI API: Used to generate post ideas.
- FAL AI API: Used to generate images based on prompts.
- Telegram API: For manual interaction (Accept/Reject) and feedback collection.
- LinkedIn API: For scheduling posts on LinkedIn.
- MongoDB: For storing post details (e.g., title, content, image URLs, status, etc.).
- Cron Jobs: Used to schedule and automate the tasks (daily content generation).


# How it works
- The bot starts by generating post ideas at 12:00 AM midnight.
- You can send the message `/generate` to the bot to generate post ideas.
- Alternatively you can make a GET HTTP Request to `/generate` to generate post ideas.
- The idea along with the content, image is sent to the Telegram bot for approval.
- If approved, the bot asks for the posting time and schedules the post on LinkedIn.
- If rejected, the bot collects reasons for rejection and asks for feedback to improve the content.
- The bot then generates an image based on the idea.
- The image is sent to the Telegram bot for approval.
- If approved, the bot posts the image to LinkedIn.
- The bot then schedules the post on LinkedIn.
- The bot then sends a success message to the Telegram bot.