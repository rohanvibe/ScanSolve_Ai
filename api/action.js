const { GoogleGenAI } = require('@google/genai');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { action, question, solution, topic, mode, message, history } = req.body;
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        let prompt = "";

        if (action === "explain") {
            if (mode === 'School Method' || mode === 'Shortcut Method') {
                prompt = `Explain the solution using ${mode}.
Method options: School step-by-step method OR Shortcut/faster trick.

Original Problem Context:
${solution}`;
            } else {
                prompt = `Re-explain this solution for a student using the following style: ${mode}
Make it easy for a grade 6 student to understand if applicable.

Solution:
${solution}`;
            }
        } else if (action === "practice") {
            prompt = `Generate 6 practice questions similar to this topic: ${topic}
Difficulty:
3 easy
2 medium
1 challenging

Original context for reference:
${solution}

Return only the text of the questions, numbered clearly.`;
        } else if (action === "quiz") {
            prompt = `Create a short multiple choice quiz question based on this concept.
Concept: ${topic}

Include exactly this structure:
Question: [question text]
A) [option]
B) [option]
C) [option]
Correct Answer: [letter]
Explanation: [brief explanation why]`;
        } else if (action === "chat") {
            prompt = `You are a helpful AI tutor answering a follow-up question from a student about a problem they just solved.

Context of problem:
Topic: ${topic}
Solution provided:
${solution}

Chat History:
${history.map(m => m.role + ": " + m.content).join("\n")}

Student's new question:
${message}

Provide a helpful, concise, and guiding answer.`;
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt]
        });

        res.status(200).json({ result: response.text });
    } catch (error) {
        console.error("Error in action API:", error);
        res.status(500).json({ error: 'Failed to process action request' });
    }
};
