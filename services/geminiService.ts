import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

// Ensure the API key is available from environment variables.
if (!process.env.API_KEY) {
  console.warn("Gemini API key not found. Summarization feature will be disabled.");
}

const getAiClient = () => {
    if (!process.env.API_KEY) {
        return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const summarizeNote = async (noteText: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) {
    throw new Error("Gemini API key not available.");
  }

  const prompt = `Please summarize the following note into a few key bullet points. Keep it concise and clear. Here is the note:\n\n---\n\n${noteText}`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error summarizing note with Gemini:", error);
    throw new Error("Failed to generate summary. Please check your API key and network connection.");
  }
};
