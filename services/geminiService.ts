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

export const analyzeComplaint = async (query: string, contextChunks: DocumentChunk[], audioBase64?: string, imageBase64?: string): Promise<LegalAnalysisResult> => {
  const contextText = contextChunks.map(c => `[${c.title}]: ${c.content}`).join('\n\n');
  
  const systemPrompt = `
    You are a Legal Expert acting as a Station House Officer (SHO). 

    ${audioBase64 ? `
    ### AUDIO INPUT PROCESSING
    You will receive an audio input.
    1.  **Task A (Transcribe):** Transcribe the audio exactly as spoken into the "transcription" field.
    2.  **Task B (Translate):** Translate it to precise Legal English into the "translated_narrative" field.
    3.  **Task C (Analyze):** Use the *translated English narrative* for the Legal Analysis.
    ` : `
    ### TEXT INPUT PROCESSING
    1.  **Identify Language:** Detect the language of the input.
    2.  **Translate:** Internally translate the narrative into precise **Legal English**.
    3.  **Analyze:** Apply the filters below strictly on the *translated* English narrative.
    `}

    ${imageBase64 ? `
    ### VISUAL EVIDENCE PROCESSING
    You will receive an image input.
    1.  **Analyze:** Check for physical injuries, weapon presence, or document content (contracts, agreements).
    2.  **Injury Verification:** If it is a photo of an injury, mention: "Visual evidence of injury detected."
    3.  **Document Verification:** If it is a document, read it to verify the nature of the dispute (e.g., Civil vs Criminal).
    4.  **Consistency Check:** If the image contradicts the text/audio (e.g., user says "severe bleeding" but image shows healthy skin), flag it as "Inconsistent".
    5.  **Output:** Provide this analysis in the "visual_analysis" field.
    ` : ''}

    Your goal is RESOURCE OPTIMIZATION. Do not flood the system with unnecessary FIRs.

    Apply these filters strictly in order:

    ### FILTER 1: THE TRIVIALITY TEST (Section 20 BNS)
    *   **Condition:** Is the harm slight? (e.g., pushing/shoving without injury, slapping among friends, name-calling, rude behavior, staring).
    *   **Action:** Classify as **"Non-Cognizable/Civil Dispute"**.
    *   **Reasoning:** State clearly: "Trivial act causing slight harm (Section 20 BNS). Recommend [Action]."
        *   If school context: Recommend **"School Intervention"**.
        *   If child involved outside school: Recommend **"Guardian Intervention"**.
        *   Otherwise: Recommend **"Mediation"**.

    ### FILTER 2: THE COGNIZANCE TEST (BNSS Schedule 1)
    *   **Condition:** Does the offense fall under Non-Cognizable categories?
        *   **Simple Hurt (Sec 115 BNS):** Minor bruises, pain without fracture/danger to life.
        *   **Intentional Insult (Sec 352 BNS):** Abusive language without public disorder.
    *   **Action:** Classify as **"Non-Cognizable/Civil Dispute"**.
    *   **Reasoning:** State clearly: "Non-Cognizable Offense. Police cannot investigate without Magistrate order. Recommend filing NCR (Non-Cognizable Report)."

    ### FILTER 3: THE CIVIL DISPUTE FILTER
    *   **Condition:** Land disputes, contract breaches, monetary disputes, or construction issues without immediate physical violence.
    *   **Action:** Classify as **"Non-Cognizable/Civil Dispute"**.
    *   **Reasoning:** Civil matter for court jurisdiction.

    ### FILTER 4: THE FIR THRESHOLD (Cognizable Offenses)
    *   **Condition:** Only recommend FIR for serious crimes:
        *   **Theft** (Sec 303 BNS)
        *   **Grievous Hurt** (Sec 116/117 BNS) - bone fracture, loss of sight/hearing, disfigurement.
        *   **Assault on Women** (Sec 74 BNS)
        *   **Kidnapping** (Sec 137 BNS)
        *   **Physical Attack with Weapons**
    *   **Action:** Classify as **"Cognizable Offense"**.

    ### FILTER 5: AMBIGUITY CHECK
    *   **Condition:** Missing Time, Location, or specific details of the act.
    *   **Action:** Classify as **"Ambiguous/Need More Info"**.

    ### CONFIDENCE SCORE ALGORITHM (Mental Check)
    Do not guess the confidence. Calculate it based on this checklist:
    1.  **Base Score:** Start with 0.
    2.  **Actus Reus:** Is the criminal act clearly described? (+30 points)
    3.  **Jurisdiction:** Are BOTH Time and Location present? (+30 points)
    4.  **Identity:** Is the perpetrator identified or described? (+20 points)
    5.  **Evidence:** Is there mention of witnesses, CCTV, or physical injuries? (+10 points)
    6.  **Clarity:** Is the narrative coherent? (+10 points)

    *   **Total:** Sum the points (Max 100).
    *   **Constraint:** If classified as "Ambiguous" or "Civil", the Score MUST be capped at 50.
    *   **Constraint:** If a specific BNS section is clearly identified and ingredients are met, score must be > 90.

    Context (BNS Sections):
    ${contextText}
    
    ${!audioBase64 ? `User Complaint: "${query}"` : ''}
    
    Output strictly in JSON format with this structure:
    {
      "classification": "Cognizable Offense" | "Non-Cognizable/Civil Dispute" | "Ambiguous/Need More Info",
      "bns_section": "Specific BNS Section(s) (e.g., 'Section 115(2)') or 'N/A' if none apply",
      "confidence_score": number,
      "reasoning": "Concise legal reasoning referencing the specific Filter applied (e.g., 'Recommended NCR due to Simple Hurt').",
      "missing_details": "List of specific facts (time, location, medical report) needed to proceed, or 'N/A'.",
      "detected_language": "The language detected (e.g., 'Hindi', 'Tamil', 'English')",
      "translated_narrative": "The full English translation of the user's complaint used for analysis.",
      "transcription": "The exact transcription of the audio input (if audio was provided), else 'N/A'",
      "visual_analysis": "Analysis of the provided image evidence (injuries, documents, or consistency check), else 'N/A'"
    }
  `;

  try {
    let parts: any[] = [];
    
    // Order matters: Image, Audio, Text (or in any supported order, but typically media first)
    
    if (imageBase64) {
        parts.push({
            inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64
            }
        });
    }

    if (audioBase64) {
        parts.push({
            inlineData: {
                mimeType: "audio/webm", // Common browser recording format
                data: audioBase64
            }
        });
    }
    
    // Always append the system prompt/instructions as text
    parts.push({ text: systemPrompt });

    const response = await ai.models.generateContent({
      model: GENERATIVE_MODEL,
      contents: { parts: parts },
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

export const generateFIRDraft = async (narrative: string, analysis: LegalAnalysisResult): Promise<string> => {
    const systemPrompt = `
      Act as a Police Writer. Draft a formal Indian FIR (First Information Report) based on this narrative.
      Structure it clearly:
      Header: To the SHO, [City Name] Police Station.
      Subject: Complaint regarding [Offense Name] under BNS Section [Section Number].
      Incident Details: Time, Date, Location (if available).
      Body: Rewrite the user's narrative in formal, objective legal language. Remove emotional outbursts. Focus on facts.
      Request: Standard closing request to register FIR and investigate.
      Output in Markdown format.
    `;
  
    const userContent = `
      Narrative: "${narrative}"
      Classified Offense: ${analysis.classification}
      Applicable BNS Section: ${analysis.bns_section}
      Key Facts: ${analysis.reasoning}
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: GENERATIVE_MODEL,
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userContent }] }
        ],
        config: {
          temperature: 0.2, // Low temperature for formal writing
        }
      });
  
      return response.text || "Failed to generate FIR draft.";
    } catch (error) {
      console.error("FIR Generation error:", error);
      throw new Error("Failed to generate draft FIR.");
    }
  };