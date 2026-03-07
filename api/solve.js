const { GoogleGenAI } = require('@google/genai');

module.exports = async function handler(req, res) {
  // Allow CORS if needed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, teacherMode, multiple } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let prompt = "";

    if (multiple) {
      prompt = `Identify all questions in this image and solve them.
Also detect the main Subject and Topic for the entire image.
Format your response exactly like this:
Subject: [Subject]
Topic: [Topic]

Q1: ...
Answer: ...

Q2: ...
Answer: ...`;
    } else if (teacherMode) {
      prompt = `Read the question from the image. Detect the Subject and Topic.
You are a teacher guiding a student. Do not reveal the final answer immediately. Ask the student questions and guide them step by step.

Format your response exactly like this:
Subject: [Subject]
Topic: [Topic]

Teacher Guidance:
...`;
    } else {
      prompt = `Read the question from the image. Detect the subject and topic.
Possible subjects: Math, Physics, Chemistry, English, General knowledge.

1. Read the question.
2. Solve it step by step.
3. Show the final answer.
4. Explain the concept simply.

Format your response exactly like this:
Subject: [Subject]
Topic: [Topic]

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
    }

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

    const text = response.text;

    // Parse Subject and Topic out of the response if possible
    let subject = "Unknown Subject";
    let topic = "General topic";
    let cleanText = text;

    const subjectMatch = text.match(/Subject:\s*(.+)/i);
    const topicMatch = text.match(/Topic:\s*(.+)/i);

    if (subjectMatch) subject = subjectMatch[1].trim();
    if (topicMatch) topic = topicMatch[1].trim();

    // clean up the Subject/Topic lines from the output text so the UI can format it nicely
    cleanText = cleanText.replace(/Subject:\s*.+\n?/i, '');
    cleanText = cleanText.replace(/Topic:\s*.+\n?/i, '');

    res.status(200).json({ result: cleanText.trim(), subject, topic });
  } catch (error) {
    console.error("Error communicating with Gemini (Solve):", error);
    res.status(500).json({ error: 'Failed to process the image' });
  }
};
