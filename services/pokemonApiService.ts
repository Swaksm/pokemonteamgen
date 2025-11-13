import { GoogleGenAI, Type, Modality } from '@google/genai';
import { PokemonRarity, PokemonType, AttackCategory, type Pokemon, type Attack, type PokemonStats } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const rarityValues = Object.values(PokemonRarity).join(', ');
const typeValues = Object.values(PokemonType).join(', ');
const categoryValues = Object.values(AttackCategory).filter(c => c !== AttackCategory.STATUS).join(', '); // For now, only Physical/Special

const STATS_SCHEMA = {
    type: Type.OBJECT,
    description: "The Pokémon's base stats. As a guideline, Common Pokémon have a total of ~300 points, Rare ~400, Epic ~500, and Legendary ~600.",
    properties: {
        hp: { type: Type.INTEGER, description: "Health Points stat." },
        attack: { type: Type.INTEGER, description: "Attack stat." },
        defense: { type: Type.INTEGER, description: "Defense stat." },
        specialAttack: { type: Type.INTEGER, description: "Special Attack stat." },
        specialDefense: { type: Type.INTEGER, description: "Special Defense stat." },
        speed: { type: Type.INTEGER, description: "Speed stat." },
    },
    required: ["hp", "attack", "defense", "specialAttack", "specialDefense", "speed"]
};

const ATTACKS_SCHEMA = {
    type: Type.ARRAY,
    description: "An array of exactly 4 unique attacks.",
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "The name of the attack." },
        type: { type: Type.STRING, description: `The attack's type. Must be one of: ${typeValues}` },
        category: { type: Type.STRING, description: `The attack's category. Must be one of: ${categoryValues}` },
        power: { type: Type.INTEGER, description: "The attack's power value, between 10 and 120." },
        accuracy: { type: Type.INTEGER, description: "The attack's accuracy, from 0 to 100." }
      },
      required: ["name", "type", "category", "power", "accuracy"]
    }
};

const POKEMON_PROPERTIES = {
    name: { type: Type.STRING, description: "The name of the new Pokémon." },
    rarity: { type: Type.STRING, description: `The rarity of the Pokémon. Must be one of: ${rarityValues}` },
    types: {
      type: Type.ARRAY,
      description: `An array of 1 or 2 Pokémon types from the available list: ${typeValues}`,
      items: { type: Type.STRING }
    },
    imagePrompt: { type: Type.STRING, description: "A detailed prompt for an image generation model to create the Pokémon's artwork. Describe its appearance, colors, and style." },
    stats: STATS_SCHEMA,
    attacks: ATTACKS_SCHEMA
};

async function generatePokemonData() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a new, unique, and creative Pokémon. Provide its name, rarity, one or two types, a detailed image prompt, its base stats (HP, Attack, Defense, Special Attack, Special Defense, Speed), and an array of 4 distinct attacks. Each attack needs a name, type, category (Physical or Special), power, and accuracy.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: POKEMON_PROPERTIES,
        required: ["name", "rarity", "types", "imagePrompt", "stats", "attacks"]
      },
    },
  });

  const jsonString = response.text.trim();
  return JSON.parse(jsonString);
}

async function generateMultiplePokemonData(count: number) {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate an array of ${count} new, unique, and creative Pokémon. For each, provide its name, rarity, one or two types, a detailed image prompt, its base stats (HP, Attack, Defense, Special Attack, Special Defense, Speed), and an array of 4 distinct attacks. Each attack needs a name, type, category (Physical or Special), power, and accuracy.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: POKEMON_PROPERTIES,
            required: ["name", "rarity", "types", "imagePrompt", "stats", "attacks"]
          }
        },
      },
    });
  
    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
  }

async function generatePokemonImage(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes = part.inlineData.data;
      return `data:image/png;base64,${base64ImageBytes}`;
    }
  }
  throw new Error("Image generation failed: no image data was received from the API.");
}

const processAndValidatePokemonData = (data: any) => {
    const { name, rarity: rawRarity, types: rawTypes, imagePrompt, stats, attacks } = data;

    let rarity: PokemonRarity = PokemonRarity.COMMON;
    if (Object.values(PokemonRarity).includes(rawRarity as PokemonRarity)) {
        rarity = rawRarity as PokemonRarity;
    } else {
        console.warn(`Received unexpected rarity "${rawRarity}", defaulting to Common.`);
    }

    const types: PokemonType[] = (rawTypes as any[]).map(t => {
        if (Object.values(PokemonType).includes(t)) {
            return t as PokemonType;
        }
        console.warn(`Received unexpected type "${t}", filtering it out.`);
        return null;
    }).filter((t): t is PokemonType => t !== null).slice(0, 2);

    if (types.length === 0) {
        types.push(PokemonType.NORMAL);
    }

    const apiId = -Math.floor(Math.random() * 1000000);

    return { apiId, name, rarity, types, imagePrompt, stats, attacks };
};

export const generatePokemon = async (): Promise<Omit<Pokemon, 'id' | 'status'>> => {
  try {
    const rawData = await generatePokemonData();
    const { apiId, name, rarity, types, imagePrompt, stats, attacks } = processAndValidatePokemonData(rawData);
    const imageUrl = await generatePokemonImage(imagePrompt);
    return { apiId, name, imageUrl, rarity, types, stats, attacks };
  } catch (error) {
    console.error("Error generating Pokémon with AI:", error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('permission'))) {
        throw new Error('The API key is invalid or missing permissions. Please check your configuration.');
    }
    throw new Error('Failed to generate a new Pokémon using AI. Please check the console for details and try again.');
  }
};

export const generateTeamOfPokemon = async (): Promise<Omit<Pokemon, 'id' | 'status'>[]> => {
  try {
    const pokemonDataArray = await generateMultiplePokemonData(6);
    const completePokemonArray = await Promise.all(pokemonDataArray.map(async (data: any) => {
      const { apiId, name, rarity, types, imagePrompt, stats, attacks } = processAndValidatePokemonData(data);
      const imageUrl = await generatePokemonImage(imagePrompt);
      return { apiId, name, imageUrl, rarity, types, stats, attacks };
    }));
    return completePokemonArray;
  } catch (error) {
    console.error("Error generating Pokémon team with AI:", error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('permission'))) {
        throw new Error('The API key is invalid or missing permissions. Please check your configuration.');
    }
    throw new Error('Failed to generate a new Pokémon team using AI. Please check the console for details and try again.');
  }
};

export const generateStatsForPokemon = async (pokemonName: string, pokemonRarity: PokemonRarity): Promise<{types: PokemonType[], stats: PokemonStats, attacks: Attack[]}> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate battle stats for a Pokémon named "${pokemonName}" with a rarity of "${pokemonRarity}". Provide its types (one or two), its base stats (HP, Attack, Defense, Special Attack, Special Defense, Speed), and an array of 4 distinct attacks. Each attack needs a name, type, category (Physical or Special), power, and accuracy.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            types: {
                type: Type.ARRAY,
                description: `An array of 1 or 2 Pokémon types from the available list: ${typeValues}`,
                items: { type: Type.STRING }
            },
            stats: STATS_SCHEMA,
            attacks: ATTACKS_SCHEMA
          },
          required: ["types", "stats", "attacks"]
        },
      },
    });

    const jsonString = response.text.trim();
    const { types, stats, attacks } = JSON.parse(jsonString);
    return { types, stats, attacks };
  } catch (error) {
    console.error(`Error generating stats for ${pokemonName}:`, error);
    throw new Error(`Failed to generate stats for ${pokemonName}.`);
  }
};
