
import React from 'react';
import type { Pokemon, Team } from '../types';
import { MAX_POKEMON_PER_TEAM } from '../constants';
import Button from './Button';
import { Trash2Icon, XIcon } from './icons';

interface TeamCardProps {
  team: Team;
  pokemons: Pokemon[];
  onDelete: (teamId: number) => void;
  onRemoveFromTeam: (pokemonId: number, teamId: number) => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, pokemons, onDelete, onRemoveFromTeam }) => {
  const teamPokemons = team.pokemonIds.map(id => pokemons.find(p => p.id === id)).filter(Boolean) as Pokemon[];
  
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-xl text-poke-yellow">{team.name}</h3>
        <Button variant="danger" onClick={() => onDelete(team.id)}>
          <Trash2Icon className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 flex-grow">
        {teamPokemons.map(pokemon => (
          <div key={pokemon.id} className="relative aspect-square bg-slate-700/50 rounded-md p-1 group">
            <img src={pokemon.imageUrl} alt={pokemon.name} className="w-full h-full object-contain" />
            <button 
              onClick={() => onRemoveFromTeam(pokemon.id, team.id)} 
              className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <XIcon className="w-3 h-3"/>
            </button>
          </div>
        ))}
        {Array.from({ length: MAX_POKEMON_PER_TEAM - teamPokemons.length }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-slate-900/50 rounded-md border-2 border-dashed border-slate-700" />
        ))}
      </div>
    </div>
  );
};

export default TeamCard;
