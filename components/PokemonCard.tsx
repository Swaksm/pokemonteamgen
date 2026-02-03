
import React, { useState } from 'react';
import { PokemonRarity, type Pokemon, type Team } from '../types';
import { RARITY_CONFIG, RESELL_VALUES, MAX_POKEMON_PER_TEAM } from '../constants';
import Button from './Button';
import { CoinsIcon, PlusIcon, Trash2Icon, BookUserIcon } from './icons';
import TypeBadge from './TypeBadge';
import Modal from './Modal';

interface PokemonCardProps {
  pokemon: Pokemon;
  teams: Team[];
  onResell: (pokemon: Pokemon) => void;
  onDelete: (pokemon: Pokemon) => void;
  onAddToTeam: (pokemonId: number, teamId: number) => void;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, teams, onResell, onDelete, onAddToTeam }) => {
  const [isAddingToTeam, setIsAddingToTeam] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Defensive check for rarity config
  const rarityConfig = RARITY_CONFIG[pokemon.rarity] || RARITY_CONFIG[PokemonRarity.COMMON];
  const { color, shadow } = rarityConfig;
  
  const resellValue = RESELL_VALUES[pokemon.rarity] || RESELL_VALUES[PokemonRarity.COMMON];
  
  const isPokemonInAnyTeam = teams.some(team => team.pokemonIds.includes(pokemon.id));

  const handleAddToTeam = (teamId: number) => {
    onAddToTeam(pokemon.id, teamId);
    setIsAddingToTeam(false);
  };

  return (
    <>
      <div className={`relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-2xl ${shadow}`}>
        <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold text-white rounded-full z-10 ${color}`}>
          {pokemon.rarity}
        </div>
        <div className="bg-slate-700/50 p-4 aspect-square flex items-center justify-center relative group">
          <img src={pokemon.imageUrl} alt={pokemon.name} className="max-h-full max-w-full object-contain" />
          <button 
            onClick={() => setShowDetails(true)}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"
          >
            <div className="bg-white/10 p-3 rounded-full"><BookUserIcon className="w-8 h-8 text-white" /></div>
          </button>
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
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20">
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

      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} title={`${pokemon.name} - Info`}>
          <div className="flex flex-col gap-4">
              <img src={pokemon.imageUrl} className="w-48 h-48 mx-auto rounded-lg bg-slate-700 p-4" />
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <h4 className="text-poke-yellow font-bold uppercase text-xs mb-1">Pokedex Entry</h4>
                  <p className="text-sm italic text-slate-300">{pokemon.lore || "A mysterious Pokemon whose origins are yet to be discovered."}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(pokemon.stats || {}).map(([key, val]) => (
                      <div key={key} className="flex justify-between border-b border-slate-700 py-1">
                          <span className="capitalize text-slate-400">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-mono text-poke-yellow">{val}</span>
                      </div>
                  ))}
              </div>
              <Button onClick={() => setShowDetails(false)}>Close</Button>
          </div>
      </Modal>
    </>
  );
};

export default PokemonCard;
