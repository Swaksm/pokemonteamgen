
import React, { useState } from 'react';
import type { Pokemon, Team } from '../types';
import Button from './Button';
import { SwordsIcon, LoaderIcon } from './icons';
import { MAX_POKEMON_PER_TEAM } from '../constants';
import * as api from '../services/pokemonApiService';
import BattleInterface from './BattleInterface';

interface BattleTabProps {
  teams: Team[];
  allPokemons: Pokemon[];
  updatePokemonInDb: (pokemon: Pokemon) => Promise<void>;
  updatePokemonInState: (pokemon: Pokemon) => void;
  setError: (message: string | null) => void;
  onVictory?: () => void;
}

const BattleTab: React.FC<BattleTabProps> = ({ teams, allPokemons, updatePokemonInDb, updatePokemonInState, setError, onVictory }) => {
  const [view, setView] = useState<'selection' | 'generating' | 'battle'>('selection');
  const [playerTeam, setPlayerTeam] = useState<Pokemon[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<Pokemon[]>([]);

  const handleStartBattle = async (team: Team) => {
    setView('generating');
    setError(null);
    try {
      // 1. Prepare Player's Team (get full objects and generate stats if missing)
      const preparedPlayerTeam = await Promise.all(
        team.pokemonIds.map(async (id) => {
          const pokemon = allPokemons.find(p => p.id === id);
          if (!pokemon) throw new Error("A Pokémon on the team could not be found.");

          // Check if the pokemon has the new stats structure
          if (!pokemon.stats || !pokemon.types || !pokemon.attacks || pokemon.attacks.length < 4) {
            const fullStats = await api.generateStatsForPokemon(pokemon.name, pokemon.rarity);
            const updatedPokemon = { ...pokemon, ...fullStats };
            await updatePokemonInDb(updatedPokemon);
            updatePokemonInState(updatedPokemon);
            return updatedPokemon;
          }
          return pokemon;
        })
      );
      setPlayerTeam(preparedPlayerTeam as Pokemon[]);

      // 2. Generate Opponent Team
      const generatedOpponents = await api.generateTeamOfPokemon();
      const opponentTeamWithIds = generatedOpponents.map((p, i) => ({ ...p, id: -1 - i, status: 'Stored' })) as Pokemon[];
      setOpponentTeam(opponentTeamWithIds);

      // 3. Start Battle
      setView('battle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start battle.');
      setView('selection');
    }
  };

  if (view === 'battle') {
    return (
      <BattleInterface 
        playerTeam={playerTeam} 
        opponentTeam={opponentTeam} 
        onBattleEnd={() => setView('selection')} 
        onVictory={onVictory}
      />
    );
  }
  
  if (view === 'generating') {
    return (
        <div className="text-center p-10 flex flex-col items-center justify-center gap-4">
            <LoaderIcon className="w-12 h-12 animate-spin text-poke-yellow"/>
            <h2 className="text-2xl font-bold">Preparing Battle...</h2>
            <p className="text-slate-400">Generating opponent team and checking your Pokémon's stats.</p>
        </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Choose Your Team for Battle</h2>
      </div>
      {teams.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {teams.map(team => {
            const isBattleReady = team.pokemonIds.length === MAX_POKEMON_PER_TEAM;
            return (
              <div key={team.id} className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h3 className="font-bold text-xl text-poke-yellow mb-2">{team.name}</h3>
                <p className="text-sm text-slate-400 mb-4">
                  {team.pokemonIds.length} / {MAX_POKEMON_PER_TEAM} Pokémon
                </p>
                <Button onClick={() => handleStartBattle(team)} disabled={!isBattleReady} className="w-full">
                  <SwordsIcon className="w-5 h-5"/>
                  {isBattleReady ? 'Start Battle' : `Needs ${MAX_POKEMON_PER_TEAM} Pokémon`}
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-slate-400 text-center py-8">Create a team with 6 Pokémon to start a battle.</p>
      )}
    </div>
  );
};

export default BattleTab;
