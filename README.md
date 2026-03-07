# ScanSolve

An AI-Powered Homework Assistant that lets you scan math equations or homework problems with your camera, and it provides a step-by-step solution using the Gemini Vision API.

## Features
- Mobile-responsive frontend using Tailwind CSS.
- Camera integration right in the browser.
- Image to AI text with Google Gemini Vision.
- Vercel-ready deployment utilizing serverless functions (`/api/solve.js`).

## Architecture
- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS (via CDN).
- **Backend / API**: Node.js, `express` (for Vercel serverless functions).
- **AI Tooling**: `@google/genai` (latest SDK).

## Setup Instructions

### 1. Install dependencies
Run the following in the project root:
```bash
npm install
```

### 2. Add GEMINI_API_KEY
Create a file named `.env` in the root directory and add your API Key:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Locally (via Express / Vercel CLI)
The best way to run this locally, keeping the same logic as the Vercel architecture, is using the Vercel CLI.
```bash
npm i -g vercel
vercel dev
```
*(Optionally you can run an Express proxy using `node server.js` if you setup one).*

### 4. Deploy to Vercel
1. Ensure your code is pushed to a Github repository.
2. Go to your [Vercel Dashboard](https://vercel.com/) and click "Add New... -> Project".
3. Import your GitHub repository.
4. Set the **Environment Variables** in the Vercel deployment settings:
    - Name: `GEMINI_API_KEY`
    - Value: `your_gemini_api_key`
5. Click **Deploy**. Vercel will process `/api/solve.js` as an auto-deployed serverless function!
