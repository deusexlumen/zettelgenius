import { GoogleGenAI, GenerateContentResponse, Part } from '@google/genai';
import { AI_MODELS } from '../constants';
import { SearchResult } from '../types';

// Ensure API Key is available
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-build' });

/**
 * Performs research using Google Search Grounding
 */
export const researchTopic = async (query: string): Promise<SearchResult> => {
  try {
    const response = await ai.models.generateContent({
      model: AI_MODELS.RESEARCH,
      contents: `Research the following topic and provide a concise summary suitable for a Zettelkasten note. Topic: ${query}`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No result generated.";
    
    // Extract grounding chunks if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: { uri: string; title: string }[] = [];

    groundingChunks.forEach((chunk) => {
      if (chunk.web?.uri && chunk.web?.title) {
        sources.push({ uri: chunk.web.uri, title: chunk.web.title });
      }
    });

    // Deduplicate sources
    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

    return { text, sources: uniqueSources };
  } catch (error) {
    console.error("Research failed:", error);
    throw error;
  }
};

/**
 * Analyzes an image using Gemini Pro Vision
 */
export const analyzeImage = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: AI_MODELS.IMAGE,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Analyze this image in detail. Describe key elements, text, and context useful for a knowledge base note.",
          },
        ],
      },
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Image analysis failed:", error);
    throw error;
  }
};

/**
 * Transcribes audio using Gemini Flash
 */
export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: AI_MODELS.AUDIO,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Transcribe this audio recording accurately. If there are distinct speakers, label them.",
          },
        ],
      },
    });
    return response.text || "No transcription generated.";
  } catch (error) {
    console.error("Transcription failed:", error);
    throw error;
  }
};

/**
 * General AI assistance (summarize, expand, etc.)
 */
export const enhanceText = async (prompt: string, context: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: AI_MODELS.GENERAL,
      contents: `Context: ${context}\n\nTask: ${prompt}\n\nPlease keep the response in Markdown format suitable for insertion into a note.`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Enhancement failed:", error);
    throw error;
  }
};
