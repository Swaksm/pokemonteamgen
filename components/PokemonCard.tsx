import React from 'react';
import type { Pokemon, Team } from '../types';
import { RARITY_CONFIG, RESELL_VALUES, MAX_POKEMON_PER_TEAM } from '../constants';
import Button from './Button';
import { CoinsIcon, PlusIcon, Trash2Icon } from './icons';
import TypeBadge from './TypeBadge';

interface PokemonCardProps {
  pokemon: Pokemon;
  teams: Team[];
  onResell: (pokemon: Pokemon) => void;
  onDelete: (pokemon: Pokemon) => void;
  onAddToTeam: (pokemonId: number, teamId: number) => void;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, teams, onResell, onDelete, onAddToTeam }) => {
  const [isAddingToTeam, setIsAddingToTeam] = React.useState(false);
  const { color, shadow } = RARITY_CONFIG[pokemon.rarity];
  const resellValue = RESELL_VALUES[pokemon.rarity];
  
  const isPokemonInAnyTeam = teams.some(team => team.pokemonIds.includes(pokemon.id));

  const handleAddToTeam = (teamId: number) => {
    onAddToTeam(pokemon.id, teamId);
    setIsAddingToTeam(false);
  };

  return (
    <div className={`relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-2xl ${shadow}`}>
      <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold text-white rounded-full ${color}`}>
        {pokemon.rarity}
      </div>
      <div className="bg-slate-700/50 p-4 aspect-square flex items-center justify-center">
        <img src={pokemon.imageUrl} alt={pokemon.name} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-center truncate">{pokemon.name}</h3>
        <div className="flex justify-center gap-2 my-2">
            {pokemon.types?.map(type => <TypeBadge key={type} type={type} />)}
        </div>
        <div className="mt-4 flex flex-col gap-2">
           <Button variant="secondary" onClick={() => setIsAddingToTeam(true)} disabled={isPokemonInAnyTeam}>
            <PlusIcon className="w-4 h-4" /> {isPokemonInAnyTeam ? 'In a Team' : 'Add to Team'}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" className="w-full" onClick={() => onResell(pokemon)}>
                <CoinsIcon className="w-4 h-4 text-yellow-400" /> +{resellValue}
            </Button>
            <Button variant="danger" onClick={() => onDelete(pokemon)}>
                <Trash2Icon className="w-4 h-4"/>
            </Button>
          </div>
        </div>
      </div>
      {isAddingToTeam && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <h4 className="font-bold mb-2">Select a Team</h4>
            <div className="w-full flex flex-col gap-2 max-h-48 overflow-y-auto">
                {teams.length > 0 ? teams.map(team => {
                    const isFull = team.pokemonIds.length >= MAX_POKEMON_PER_TEAM;
                    return (
                        <button 
                            key={team.id} 
                            disabled={isFull}
                            onClick={() => handleAddToTeam(team.id)}
                            className="text-left w-full px-3 py-2 bg-slate-700 rounded-md hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500 transition-colors"
                        >
                            {team.name} ({team.pokemonIds.length}/{MAX_POKEMON_PER_TEAM})
                        </button>
                    )
                }) : <p className="text-slate-400 text-center text-sm">No teams created yet.</p>}
            </div>
             <button onClick={() => setIsAddingToTeam(false)} className="mt-4 text-sm text-slate-300 hover:text-white">Cancel</button>
        </div>
      )}
    </div>
  );
};

export default PokemonCard;
