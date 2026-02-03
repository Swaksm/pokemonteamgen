
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { PokemonRarity, PokemonType, AttackCategory, type Pokemon, type Attack, type PokemonStats } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const STATS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        hp: { type: Type.INTEGER },
        attack: { type: Type.INTEGER },
        defense: { type: Type.INTEGER },
        specialAttack: { type: Type.INTEGER },
        specialDefense: { type: Type.INTEGER },
        speed: { type: Type.INTEGER },
    },
    required: ["hp", "attack", "defense", "specialAttack", "specialDefense", "speed"]
};

const ATTACKS_SCHEMA = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        type: { type: Type.STRING },
        category: { type: Type.STRING },
        power: { type: Type.INTEGER },
        accuracy: { type: Type.INTEGER }
      },
      required: ["name", "type", "category", "power", "accuracy"]
    }
};

const POKEMON_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        rarity: { 
          type: Type.STRING, 
          description: "Must be exactly one of: Common, Rare, Epic, Legendary" 
        },
        types: { type: Type.ARRAY, items: { type: Type.STRING } },
        imagePrompt: { type: Type.STRING },
        stats: STATS_SCHEMA,
        attacks: ATTACKS_SCHEMA,
        lore: { type: Type.STRING },
        synthesisReport: { 
          type: Type.STRING, 
          description: "An explanation of how the generated stats/types match the user's input specification." 
        }
    },
    required: ["name", "rarity", "types", "imagePrompt", "stats", "attacks", "lore", "synthesisReport"]
};

// Helper to ensure rarity matches our enum
const validateRarity = (rarityStr: string): PokemonRarity => {
  const normalized = rarityStr?.trim().toLowerCase();
  const match = Object.values(PokemonRarity).find(r => r.toLowerCase() === normalized);
  return match || PokemonRarity.COMMON;
};

async function generatePokemonImage(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `A vibrant, professional Pokemon card style illustration of: ${prompt}. Solid colorful background, high quality anime style.` }] },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Image generation failed");
}

export const generatePokemon = async (spec?: string): Promise<Omit<Pokemon, 'id' | 'status'>> => {
  const model = 'gemini-3-flash-preview';
  const prompt = spec 
    ? `Create a unique Pokemon based on this specification: "${spec}". Provide a synthesisReport explaining your logic.`
    : `Generate a new, unique, and creative Pokémon. Provide a synthesisReport explaining your logic.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: POKEMON_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 } 
    },
  });

  const raw = JSON.parse(response.text);
  const imageUrl = await generatePokemonImage(raw.imagePrompt);
  
  return {
    apiId: -Math.floor(Math.random() * 1000000),
    name: raw.name,
    imageUrl,
    rarity: validateRarity(raw.rarity),
    types: raw.types.slice(0, 2),
    stats: raw.stats,
    attacks: raw.attacks,
    lore: raw.lore,
    synthesisReport: raw.synthesisReport
  };
};

export const analyzeTeamSynergy = async (teamPokemons: Pokemon[]): Promise<string> => {
  const teamContext = teamPokemons.map(p => `${p.name} (${p.types?.join('/')})`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this Pokemon team and provide a brief strategic report.\n\nTeam:\n${teamContext}`,
    config: { thinkingConfig: { thinkingBudget: 0 } }
  });
  return response.text;
};

export const getBattleAdvice = async (playerActive: any, opponentActive: any, log: string[]): Promise<{ advice: string, recommendedMove: string }> => {
    const context = `Your Pokemon: ${playerActive.name} (${playerActive.types.join('/')})
Opponent: ${opponentActive.name} (${opponentActive.types.join('/')})
Moves available: ${playerActive.attacks.map((a:any) => a.name).join(', ')}`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a professional Pokemon Coach. Suggest the best move and why.\n\n${context}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              advice: { type: Type.STRING },
              recommendedMove: { type: Type.STRING, description: "The exact name of the move to use." }
            },
            required: ["advice", "recommendedMove"]
          },
          thinkingConfig: { thinkingBudget: 0 }
        }
    });
    return JSON.parse(response.text);
};

export const generateStatsForPokemon = async (name: string, rarity: PokemonRarity): Promise<{ stats: PokemonStats; attacks: Attack[]; types: PokemonType[]; lore: string }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate stats for ${name} (${rarity}).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          types: { type: Type.ARRAY, items: { type: Type.STRING } },
          stats: STATS_SCHEMA,
          attacks: ATTACKS_SCHEMA,
          lore: { type: Type.STRING }
        },
        required: ["types", "stats", "attacks", "lore"]
      },
      thinkingConfig: { thinkingBudget: 0 }
    },
  });

  return JSON.parse(response.text);
};

export const generateTeamOfPokemon = async (): Promise<Omit<Pokemon, 'id' | 'status'>[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate 6 unique Pokemon.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: POKEMON_SCHEMA },
      thinkingConfig: { thinkingBudget: 0 }
    },
  });

  const dataArray = JSON.parse(response.text);
  return Promise.all(dataArray.map(async (raw: any) => {
    const imageUrl = await generatePokemonImage(raw.imagePrompt);
    return {
      apiId: -Math.floor(Math.random() * 1000000),
      name: raw.name,
      imageUrl,
      rarity: validateRarity(raw.rarity),
      types: raw.types,
      stats: raw.stats,
      attacks: raw.attacks,
      lore: raw.lore,
      synthesisReport: raw.synthesisReport
    };
  }));
};
