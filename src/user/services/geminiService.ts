import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Character, Message, UserPersona } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCharacterResponse = async (
  character: Character,
  history: Message[],
  userMessage: string,
  userPersona?: UserPersona
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) {
    return "连接出现问题。(API Key 缺失)";
  }

  try {
    const model = 'gemini-2.5-flash';
    
    let userContext = "";
    if (userPersona) {
        userContext = `
        [User Roleplay Info]
        The user is roleplaying as a character with the following details. You must treat them as this specific persona:
        Name: ${userPersona.name || 'Unknown'}
        Gender: ${userPersona.gender === 'male' ? 'Male' : userPersona.gender === 'female' ? 'Female' : 'Unknown'}
        Age: ${userPersona.age || 'Unknown'}
        Profession: ${userPersona.profession || 'Unknown'}
        Appearance/Background: ${userPersona.basicInfo || 'Unknown'}
        Personality: ${userPersona.personality || 'Unknown'}
        `;
    }

    // Construct a persona-based system instruction
    const systemInstruction = `
      You are roleplaying as ${character.name}. 
      Character Bio: ${character.bio}.
      Personality Tags: ${character.tags.join(', ')}.
      Relationship Level: ${character.relationshipLevel}/100.
      
      ${character.personality ? `Detailed Personality: ${character.personality}` : ''}
      ${character.plotDescription ? `Current Plot/Context: ${character.plotDescription}` : ''}
      
      ${userContext}

      Respond to the user naturally in CHINESE (Simplified).
      Keep messages relatively short (under 50 words) unless a deep topic is discussed.
      Maintain the tone of an otome game character (romantic, friendly, or mysterious based on bio).
      Do not break character.
    `;

    // Convert history to a simple string format for context (simplified for this demo)
    const conversationHistory = history.slice(-10).map(msg => 
      `${msg.senderId === 'user' ? (userPersona?.name || 'User') : character.name}: ${msg.text}`
    ).join('\n');

    const prompt = `
      ${conversationHistory}
      ${userPersona?.name || 'User'}: ${userMessage}
      ${character.name}:
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8, // Creative and varied
      }
    });

    return response.text || "...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "我... 刚才走神了，你说了什么？";
  }
};