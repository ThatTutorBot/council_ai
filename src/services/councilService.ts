import { GoogleGenAI } from "@google/genai";
import { ADVISORS, AdvisorPersona } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface CouncilMessage {
  advisorId: string;
  round: 'clarifying' | 'opening' | 'critique' | 'synthesis';
  contentPrimary: string;
  contentSecondary: string;
  timestamp: number;
}

export interface CouncilSession {
  userQuestion: string;
  clarifyingAnswers: Record<string, string>;
  messages: CouncilMessage[];
  currentRound: 'input' | 'clarifying' | 'opening' | 'critique' | 'synthesis';
  currentAdvisorIndex: number; // For sequential clarifying round
}

export class CouncilService {
  private static async generateBilingualResponse(
    advisor: AdvisorPersona,
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ primary: string; secondary: string }> {
    const model = "gemini-3-flash-preview";
    
    const prompt = `
      ${advisor.personaInstructions}
      
      CONTEXT:
      ${systemPrompt}
      
      USER INPUT:
      ${userPrompt}
      
      RESPONSE FORMAT (strictly JSON):
      {
        "primary": "Your response in ${advisor.primaryLang === 'zh' ? 'Chinese' : 'English'}",
        "secondary": "Your response in ${advisor.secondaryLang === 'zh' ? 'Chinese' : 'English'}"
      }
    `;

    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = result.text || '{}';
      // Basic JSON cleaning if needed, though responseMimeType should handle it
      const cleaned = text.trim().replace(/^```json/, '').replace(/```$/, '');
      const response = JSON.parse(cleaned);
      return {
        primary: response.primary || '',
        secondary: response.secondary || '',
      };
    } catch (error) {
      console.error("AI Generation Error:", error);
      return {
        primary: "The stars are clouded... (Communication error)",
        secondary: "The stars are clouded... (Communication error)",
      };
    }
  }

  static async getClarifyingQuestion(advisorId: string, userQuestion: string): Promise<CouncilMessage> {
    const advisor = ADVISORS.find(a => a.id === advisorId)!;
    const systemPrompt = `You are in a council with two other advisors. The user has asked the question: "${userQuestion}". 
    Before you give your opinion, you must ask ONE specific, deep clarifying question to better understand their situation.`;
    
    const resp = await this.generateBilingualResponse(advisor, systemPrompt, "Provide your identifying question.");
    
    return {
      advisorId,
      round: 'clarifying',
      contentPrimary: resp.primary,
      contentSecondary: resp.secondary,
      timestamp: Date.now(),
    };
  }

  static async getOpeningStatement(
    advisorId: string, 
    userQuestion: string, 
    clarifyingAnswers: Record<string, string>
  ): Promise<CouncilMessage> {
    const advisor = ADVISORS.find(a => a.id === advisorId)!;
    const answersStr = Object.entries(clarifyingAnswers)
      .map(([id, ans]) => `${ADVISORS.find(a => a.id === id)?.name}: ${ans}`)
      .join('\n');
      
    const systemPrompt = `User Question: "${userQuestion}"
    Context provided through clarifying questions:
    ${answersStr}
    
    Now, provide your opening statement/opinion. Be true to your persona.`;
    
    const resp = await this.generateBilingualResponse(advisor, systemPrompt, "State your position.");
    
    return {
      advisorId,
      round: 'opening',
      contentPrimary: resp.primary,
      contentSecondary: resp.secondary,
      timestamp: Date.now(),
    };
  }

  static async getCritique(
    advisorId: string,
    userQuestion: string,
    allOpenings: CouncilMessage[]
  ): Promise<CouncilMessage> {
    const advisor = ADVISORS.find(a => a.id === advisorId)!;
    const openingsStr = allOpenings
      .filter(m => m.advisorId !== advisorId)
      .map(m => `${ADVISORS.find(a => a.id === m.advisorId)?.name} said: ${m.contentPrimary}`)
      .join('\n\n');
      
    const systemPrompt = `User Question: "${userQuestion}"
    Other advisors have given these opening statements:
    ${openingsStr}
    
    Critique their views. Challenge their assumptions or offer a different perspective based on your own values.`;
    
    const resp = await this.generateBilingualResponse(advisor, systemPrompt, "Offer your critique.");
    
    return {
      advisorId,
      round: 'critique',
      contentPrimary: resp.primary,
      contentSecondary: resp.secondary,
      timestamp: Date.now(),
    };
  }

  static async getSynthesis(userQuestion: string, allMessages: CouncilMessage[]): Promise<CouncilMessage> {
    const model = "gemini-3.1-pro-preview"; // Use Pro for synthesis
    const history = allMessages
      .map(m => `${ADVISORS.find(a => a.id === m.advisorId)?.name} (${m.round}): ${m.contentPrimary}`)
      .join('\n\n');
      
    const prompt = `
      As a neutral scribe and master synthesizer, review the following council discussion regarding: "${userQuestion}"
      
      DISCUSSION HISTORY:
      ${history}
      
      Provide a final synthesis.
      
      FORMAT (JSON):
      {
        "primary": "A cohesive summary in English and Chinese, highlighting 3 distinct decision paths: 1) The Way of Strategy, 2) The Way of Power, 3) The Way of Virtue.",
        "secondary": "A brief recommendation based on the collective wisdom."
      }
    `;

    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = result.text || '{}';
      const cleaned = text.trim().replace(/^```json/, '').replace(/```$/, '');
      const response = JSON.parse(cleaned);
      return {
        advisorId: 'council-scribe',
        round: 'synthesis',
        contentPrimary: response.primary || '',
        contentSecondary: response.secondary || '',
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Synthesis Error:", error);
      return {
        advisorId: 'council-scribe',
        round: 'synthesis',
        contentPrimary: "The council has adjourned without a final word.",
        contentSecondary: "Error in synthesis.",
        timestamp: Date.now(),
      };
    }
  }
}
