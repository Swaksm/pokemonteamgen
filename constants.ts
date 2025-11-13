import { PokemonRarity, PokemonType } from './types';

export const DB_NAME = 'PokemonDB';
export const DB_VERSION = 1;
export const POKEMONS_STORE = 'pokemons';
export const TEAMS_STORE = 'teams';
export const SETTINGS_STORE = 'settings';
export const TOKEN_BALANCE_KEY = 'tokenBalance';
export const LAST_SPIN_TIME_KEY = 'lastSpinTime';

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

export const TYPE_COLORS: Record<PokemonType, string> = {
  [PokemonType.NORMAL]: 'bg-gray-400 text-black',
  [PokemonType.FIRE]: 'bg-orange-500 text-white',
  [PokemonType.WATER]: 'bg-blue-500 text-white',
  [PokemonType.GRASS]: 'bg-green-500 text-white',
  [PokemonType.ELECTRIC]: 'bg-yellow-400 text-black',
  [PokemonType.ICE]: 'bg-cyan-300 text-black',
  [PokemonType.FIGHTING]: 'bg-red-700 text-white',
  [PokemonType.POISON]: 'bg-purple-500 text-white',
  [PokemonType.GROUND]: 'bg-yellow-600 text-white',
  [PokemonType.FLYING]: 'bg-indigo-400 text-white',
  [PokemonType.PSYCHIC]: 'bg-pink-500 text-white',
  [PokemonType.BUG]: 'bg-lime-500 text-black',
  [PokemonType.ROCK]: 'bg-yellow-700 text-white',
  [PokemonType.GHOST]: 'bg-indigo-700 text-white',
  [PokemonType.DRAGON]: 'bg-indigo-600 text-white',
  [PokemonType.STEEL]: 'bg-gray-500 text-white',
  [PokemonType.DARK]: 'bg-gray-800 text-white',
  [PokemonType.FAIRY]: 'bg-pink-300 text-black',
};
