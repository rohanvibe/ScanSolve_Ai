const express = require('express');
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

app.post('/api/solve', async (req, res) => {
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

        res.json({ result: response.text });
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

app.listen(port, () => {
    console.log(`Express Server running locally at http://localhost:${port}`);
});
