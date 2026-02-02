
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { PokemonRarity, PokemonType, AttackCategory, type Pokemon, type Attack, type PokemonStats } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const rarityValues = Object.values(PokemonRarity).join(', ');
const typeValues = Object.values(PokemonType).join(', ');
const categoryValues = Object.values(AttackCategory).filter(c => c !== AttackCategory.STATUS).join(', ');

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
        rarity: { type: Type.STRING },
        types: { type: Type.ARRAY, items: { type: Type.STRING } },
        imagePrompt: { type: Type.STRING },
        stats: STATS_SCHEMA,
        attacks: ATTACKS_SCHEMA,
        lore: { type: Type.STRING, description: "A creative 2-sentence Pokedex entry." }
    },
    required: ["name", "rarity", "types", "imagePrompt", "stats", "attacks", "lore"]
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

// Fix: Added missing generateStatsForPokemon function to populate stats and attacks for existing Pokemon
export const generateStatsForPokemon = async (name: string, rarity: PokemonRarity): Promise<{ stats: PokemonStats; attacks: Attack[]; types: PokemonType[]; lore: string }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate detailed RPG stats, types, and 4 attacks for a Pokemon named "${name}" with rarity "${rarity}".`,
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
    },
  });

  return JSON.parse(response.text);
};

export const generatePokemon = async (spec?: string): Promise<Omit<Pokemon, 'id' | 'status'>> => {
  const model = spec ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  const prompt = spec 
    ? `Create a unique Pokemon based on this specification: "${spec}". Ensure the stats, types, and moves reflect the description accurately.`
    : `Generate a new, unique, and creative Pokémon.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: POKEMON_SCHEMA,
    },
  });

  const raw = JSON.parse(response.text);
  const imageUrl = await generatePokemonImage(raw.imagePrompt);
  
  return {
    apiId: -Math.floor(Math.random() * 1000000),
    name: raw.name,
    imageUrl,
    rarity: Object.values(PokemonRarity).includes(raw.rarity) ? raw.rarity : PokemonRarity.COMMON,
    types: raw.types.slice(0, 2),
    stats: raw.stats,
    attacks: raw.attacks,
    lore: raw.lore
  };
};

export const generateTeamOfPokemon = async (): Promise<Omit<Pokemon, 'id' | 'status'>[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate an array of 6 unique Pokemon.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: POKEMON_SCHEMA },
    },
  });

  const dataArray = JSON.parse(response.text);
  return Promise.all(dataArray.map(async (raw: any) => {
    const imageUrl = await generatePokemonImage(raw.imagePrompt);
    return {
      apiId: -Math.floor(Math.random() * 1000000),
      name: raw.name,
      imageUrl,
      rarity: raw.rarity,
      types: raw.types,
      stats: raw.stats,
      attacks: raw.attacks,
      lore: raw.lore
    };
  }));
};

export const analyzeTeamSynergy = async (teamPokemons: Pokemon[]): Promise<string> => {
  const teamContext = teamPokemons.map(p => `${p.name} (${p.types?.join('/')}) - Stats: ${JSON.stringify(p.stats)}`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `As a Pokemon Professor, analyze this team and provide a brief strategic report (max 150 words). Identify weaknesses and suggest a type or role to add.\n\nTeam:\n${teamContext}`,
  });
  return response.text;
};

export const getBattleAdvice = async (playerActive: any, opponentActive: any, log: string[]): Promise<string> => {
    const context = `Your Pokemon: ${playerActive.name} (${playerActive.types.join('/')}) HP: ${playerActive.currentHp}/${playerActive.stats.hp}
Opponent: ${opponentActive.name} (${opponentActive.types.join('/')}) HP: ${opponentActive.currentHp}/${opponentActive.stats.hp}
Moves: ${playerActive.attacks.map((a:any) => `${a.name} (${a.type}, ${a.power} Pwr)`).join(', ')}
Battle Log Snippet: ${log.slice(-3).join(' | ')}`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a professional Pokemon Coach. Given the battle state, tell the player which move to use or if they should switch. Be concise.\n\n${context}`,
    });
    return response.text;
};
