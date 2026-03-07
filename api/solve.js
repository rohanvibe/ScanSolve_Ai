const { GoogleGenAI } = require('@google/genai');

module.exports = async function handler(req, res) {
  // Allow CORS if needed, or simply handle POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Initialize Gemini SDK with apiKey from Environment Variable
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

    // Remove the data URL prefix if present
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

    res.status(200).json({ result: response.text });
  } catch (error) {
    console.error("Error communicating with Gemini:", error);
    res.status(500).json({ error: 'Failed to process the image' });
  }
};
