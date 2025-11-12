import { GoogleGenAI, Type, Modality } from '@google/genai';
import { PokemonRarity } from '../types';
import type { Pokemon } from '../types';

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates structured data for a new Pokémon using a text model.
 * @returns {Promise<{name: string, rarity: string, imagePrompt: string}>}
 */
async function generatePokemonData() {
  const rarityValues = Object.values(PokemonRarity).join(', ');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a new, unique, and creative Pokémon. Provide a name, rarity, and a detailed image prompt. The rarity must be one of: ${rarityValues}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The name of the new Pokémon." },
          rarity: { type: Type.STRING, description: `The rarity of the Pokémon. Must be one of: ${rarityValues}` },
          imagePrompt: { type: Type.STRING, description: "A detailed prompt for an image generation model to create the Pokémon's artwork. Describe its appearance, colors, and style (e.g., 'A small, fluffy, electric-type squirrel with glowing cheeks and a lightning bolt-shaped tail, official artwork style')." }
        },
        required: ["name", "rarity", "imagePrompt"]
      },
    },
  });

  const jsonString = response.text.trim();
  return JSON.parse(jsonString);
}

/**
 * Generates an image from a text prompt using an image model.
 * @param {string} prompt - The detailed prompt for the image.
 * @returns {Promise<string>} A base64 data URL for the generated image.
 */
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

/**
 * Main function to generate a complete Pokémon object.
 * This orchestrates the data generation and image generation steps.
 */
export const generatePokemon = async (): Promise<Omit<Pokemon, 'id' | 'status'>> => {
  try {
    // Step 1: Generate the Pokémon's conceptual data (name, rarity, prompt)
    const { name, rarity: rawRarity, imagePrompt } = await generatePokemonData();

    // Validate the generated rarity against our defined enum
    let rarity: PokemonRarity = PokemonRarity.COMMON;
    if (Object.values(PokemonRarity).includes(rawRarity as PokemonRarity)) {
      rarity = rawRarity as PokemonRarity;
    } else {
        console.warn(`Received unexpected rarity "${rawRarity}", defaulting to Common.`);
    }

    // Step 2: Generate the Pokémon's image based on the generated prompt
    const imageUrl = await generatePokemonImage(imagePrompt);

    // Create a unique ID for our custom Pokémon. Using a negative number
    // ensures it won't conflict with any official Pokémon IDs.
    const apiId = -Math.floor(Math.random() * 1000000);

    return { apiId, name, imageUrl, rarity };

  } catch (error) {
    console.error("Error generating Pokémon with AI:", error);
    // Provide a more user-friendly error to be displayed in the UI
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('permission'))) {
        throw new Error('The API key is invalid or missing permissions. Please check your configuration.');
    }
    throw new Error('Failed to generate a new Pokémon using AI. Please check the console for details and try again.');
  }
};
