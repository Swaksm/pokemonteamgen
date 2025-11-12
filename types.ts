
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

export interface Pokemon {
  id: number;
  apiId: number;
  name: string;
  imageUrl: string;
  rarity: PokemonRarity;
  status: PokemonStatus;
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
