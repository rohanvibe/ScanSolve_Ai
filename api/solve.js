const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');

const resultsCache = new Map();

function getHash(base64Data) {
  return crypto.createHash('sha256').update(base64Data).digest('hex');
}

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

module.exports = async function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip';
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return res.status(429).json({ error: limit.error });
  }
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

    const imageHash = getHash(base64Data);
    if (resultsCache.has(imageHash)) {
      console.log("Serving result from cache!");
      return res.status(200).json({ result: resultsCache.get(imageHash) });
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

    // Size limit for cache
    if (resultsCache.size > 1000) {
      const firstKey = resultsCache.keys().next().value;
      resultsCache.delete(firstKey);
    }

    res.status(200).json({ result: resultText });
  } catch (error) {
    console.error("Error communicating with Gemini:", error);
    res.status(500).json({ error: 'Failed to process the image' });
  }
};
