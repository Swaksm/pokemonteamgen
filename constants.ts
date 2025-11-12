
import { PokemonRarity } from './types';

export const DB_NAME = 'PokemonDB';
export const DB_VERSION = 1;
export const POKEMONS_STORE = 'pokemons';
export const TEAMS_STORE = 'teams';
export const SETTINGS_STORE = 'settings';
export const TOKEN_BALANCE_KEY = 'tokenBalance';

export const INITIAL_TOKENS = 100;
export const GENERATE_COST = 10;
export const RESELL_VALUES: Record<PokemonRarity, number> = {
  [PokemonRarity.COMMON]: 5,
  [PokemonRarity.RARE]: 15,
  [PokemonRarity.EPIC]: 50,
  [PokemonRarity.LEGENDARY]: 200,
};

export const MAX_POKEMON_PER_TEAM = 6;

export const RARITY_CONFIG: Record<PokemonRarity, { color: string; shadow: string; }> = {
  [PokemonRarity.COMMON]: { color: 'bg-gray-500', shadow: 'shadow-gray-400/50' },
  [PokemonRarity.RARE]: { color: 'bg-sky-500', shadow: 'shadow-sky-400/50' },
  [PokemonRarity.EPIC]: { color: 'bg-purple-600', shadow: 'shadow-purple-500/50' },
  [PokemonRarity.LEGENDARY]: { color: 'bg-amber-500', shadow: 'shadow-amber-400/50' },
};
