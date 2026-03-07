const express = require('express');
const crypto = require('crypto');

const resultsCache = new Map();

function getHash(base64Data) {
    return crypto.createHash('sha256').update(base64Data).digest('hex');
}
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from public
app.use(express.static(path.join(__dirname, 'public')));

const rateLimitMap = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const MINUTE = 60 * 1000;
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * 60 * 60 * 1000;

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, []);
    }

    const timestamps = rateLimitMap.get(ip);
    const validTimestamps = timestamps.filter(t => now - t < DAY);

    const scansLastMinute = validTimestamps.filter(t => now - t < MINUTE).length;
    const scansLastHour = validTimestamps.filter(t => now - t < HOUR).length;
    const scansLastDay = validTimestamps.length;

    if (scansLastMinute >= 2) return { allowed: false, error: 'Limit reached: Maximum 2 scans per minute.' };
    if (scansLastHour >= 8) return { allowed: false, error: 'Limit reached: Maximum 8 scans per hour.' };
    if (scansLastDay >= 30) return { allowed: false, error: 'Limit reached: Maximum 30 scans per day.' };

    validTimestamps.push(now);
    rateLimitMap.set(ip, validTimestamps);
    return { allowed: true };
}

app.post('/api/solve', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip';
    const limit = checkRateLimit(ip);
    if (!limit.allowed) {
        return res.status(429).json({ error: limit.error });
    }

    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are solver and explainer for a person

1. Read the question from the image.
2. Solve it step by step.
3. Show the final answer.
4. Explain the concept simply.

Format your response exactly like this:

Question:
...

Steps:
1.
2.
3.

Final Answer:
...

Simple Explanation:
...`;

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const imageHash = getHash(base64Data);
        if (resultsCache.has(imageHash)) {
            console.log("Serving result from cache!");
            return res.json({ result: resultsCache.get(imageHash) });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/jpeg"
                    }
                }
            ]
        });

        const resultText = response.text;
        resultsCache.set(imageHash, resultText);

        if (resultsCache.size > 1000) {
            const firstKey = resultsCache.keys().next().value;
            resultsCache.delete(firstKey);
        }

        res.json({ result: resultText });
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

app.listen(port, () => {
    console.log(`Express Server running locally at http://localhost:${port}`);
});
