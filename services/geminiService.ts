import { GoogleGenAI } from "@google/genai";
import { DocumentChunk, LegalAnalysisResult } from '../types';

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

export const analyzeComplaint = async (query: string, contextChunks: DocumentChunk[]): Promise<LegalAnalysisResult> => {
  const contextText = contextChunks.map(c => `[${c.title}]: ${c.content}`).join('\n\n');
  
  const prompt = `
    You are a Senior Station House Officer (SHO) and Legal Expert in the Bharatiya Nyaya Sanhita (BNS).
    
    Task: Analyze the user's narrative to distinguish between genuine criminal offenses and arbitrary/civil disputes.
    
    Instructions:
    1. **Analyze the Narrative**: Identify the 'Ingredients of the Offense' (Mens Rea - Guilty Mind, Actus Reus - Guilty Act).
    2. **Search Context**: Use the provided BNS text below as your legal reference.
    3. **CRITICAL FILTERING**:
       - **Arbitrary/Trivial**: If the narrative is vague (e.g., "he looked at me weird"), vindictive without facts, or involves trivial harm (like Section 33 BNS/Section 95 IPC), classify as **'Non-Cognizable/Civil Dispute'**.
       - **Civil Dispute**: If it is purely a contract/money dispute without evidence of fraud/cheating intent, classify as **'Non-Cognizable/Civil Dispute'**.
       - **Genuine**: If there is clear evidence of a crime (theft, assault, hurt, specific threat) with intent, classify as **'Cognizable Offense'**.
    4. **Confidence**: Assign a confidence score (0-100) based on how well the facts fit the legal definition.

    Context (BNS Sections):
    ${contextText}
    
    User Complaint: "${query}"
    
    Output strictly in JSON format with this structure:
    {
      "classification": "Cognizable Offense" | "Non-Cognizable/Civil Dispute" | "Ambiguous/Need More Info",
      "bns_section": "Specific BNS Section(s) (e.g., 'Section 115(2)') or 'N/A' if none apply",
      "confidence_score": number,
      "reasoning": "Concise legal reasoning linking facts to ingredients of the section.",
      "missing_details": "List of specific facts (time, weapon, medical report, contract) needed to proceed."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: GENERATIVE_MODEL,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response generated.");

    // Clean potential markdown wrappers if the model adds them (though responseMimeType usually handles this)
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanText) as LegalAnalysisResult;
  } catch (error) {
    console.error("Analysis error:", error);
    return {
        classification: "Ambiguous/Need More Info",
        bns_section: "Error",
        confidence_score: 0,
        reasoning: "Failed to process the complaint due to a technical error. Please try again.",
        missing_details: "N/A"
    };
  }
};