import { GoogleGenAI } from "@google/genai";
import { DocumentChunk } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const EMBEDDING_MODEL = 'text-embedding-004';
const GENERATIVE_MODEL = 'gemini-2.5-flash';

export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });
    
    if (response.embeddings && response.embeddings.length > 0) {
        return response.embeddings[0].values;
    }
    throw new Error("No embedding returned");
  } catch (error) {
    console.error("Embedding error:", error);
    throw error;
  }
};

export const generateRAGResponse = async (query: string, contextChunks: DocumentChunk[]): Promise<string> => {
  const contextText = contextChunks.map(c => `[${c.title}]: ${c.content}`).join('\n\n');
  
  const prompt = `
    You are an expert legal AI assistant specializing in the Bharatiya Nyaya Sanhita (BNS).
    
    Task: Identify the most relevant BNS sections for the user's crime description.
    
    User Complaint/Query: "${query}"
    
    Relevant Legal Text (Context):
    ${contextText}
    
    Instructions:
    1. Analyze the context provided.
    2. Identify which Section(s) of the BNS apply to the user's situation.
    3. Explain WHY these sections apply based on the facts.
    4. If the text clearly defines punishment, mention it briefly.
    5. If the provided context does not contain the answer, say "The uploaded legal text does not appear to contain relevant sections for this query."
    
    Format: Use Markdown. Bold the Section Numbers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: GENERATIVE_MODEL,
      contents: prompt,
      config: {
        temperature: 0.1, // Low temperature for factual legal grounding
      }
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Generation error:", error);
    throw error;
  }
};