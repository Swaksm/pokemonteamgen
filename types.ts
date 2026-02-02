
export enum PokemonRarity {
  COMMON = 'Common',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary',
}

export enum PokemonStatus {
  STORED = 'Stored',
  SOLD = 'Sold',
}

export enum PokemonType {
  NORMAL = "Normal",
  FIRE = "Fire",
  WATER = "Water",
  GRASS = "Grass",
  ELECTRIC = "Electric",
  ICE = "Ice",
  FIGHTING = "Fighting",
  POISON = "Poison",
  GROUND = "Ground",
  FLYING = "Flying",
  PSYCHIC = "Psychic",
  BUG = "Bug",
  ROCK = "Rock",
  GHOST = "Ghost",
  DRAGON = "Dragon",
  STEEL = "Steel",
  DARK = "Dark",
  FAIRY = "Fairy",
}

export enum AttackCategory {
  PHYSICAL = "Physical",
  SPECIAL = "Special",
  STATUS = "Status",
}

export interface Attack {
  name: string;
  type: PokemonType;
  category: AttackCategory;
  power: number;
  accuracy: number;
}

export interface PokemonStats {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
}

export interface Pokemon {
  id: number;
  apiId: number;
  name: string;
  imageUrl: string;
  rarity: PokemonRarity;
  status: PokemonStatus;
  types?: PokemonType[];
  stats?: PokemonStats;
  attacks?: Attack[];
  lore?: string;
}

export interface Team {
  id: number;
  name: string;
  pokemonIds: number[];
}

export interface TokenBalance {
  id: string;
  balance: number;
}
