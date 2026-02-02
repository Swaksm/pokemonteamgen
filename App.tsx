import React, { useState, useEffect, useCallback } from 'react';
import type { Pokemon, Team, Mission } from './types';
// Fixed: Import PokemonType as a value to use it with Object.values()
import { PokemonStatus, PokemonType } from './types';
import * as db from './services/indexedDbService';
import * as api from './services/pokemonApiService';
import { GENERATE_COST, RESELL_VALUES, MAX_POKEMON_PER_TEAM } from './constants';

import Header from './components/Header';
import Button from './components/Button';
import PokemonCard from './components/PokemonCard';
import TeamCard from './components/TeamCard';
import Modal from './components/Modal';
import BattleTab from './components/BattleTab';
import GameCornerTab from './components/GameCornerTab';
import ProfessorTab from './components/ProfessorTab';
import MissionCenter from './components/MissionCenter';
import { LoaderIcon, PlusIcon, SparklesIcon, BookUserIcon, ShieldIcon, XIcon, SwordsIcon, TicketIcon } from './components/icons';

type ActiveTab = 'pokedex' | 'teams' | 'battle' | 'gamecorner' | 'professor';
type ModalState = 'none' | 'confirm-resell' | 'confirm-delete-pokemon' | 'create-team' | 'confirm-delete-team';

const App: React.FC = () => {
  const [tokens, setTokens] = useState<number>(0);
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('pokedex');

  const [modalState, setModalState] = useState<ModalState>('none');
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [newTeamName, setNewTeamName] = useState('');

  const refreshMissions = useCallback(async () => {
    // Fixed: Use PokemonType directly from imports as it's not exported from the api service
    const types: PokemonType[] = Object.values(PokemonType) as PokemonType[];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const newMissions: Mission[] = [
      {
        id: 'm1',
        description: 'Generate new specimens in the Lab.',
        type: 'collect',
        target: 3,
        current: 0,
        reward: 30,
        completed: false,
        claimed: false
      },
      {
        id: 'm2',
        description: `Synthesize a Pokémon with this elemental affinity:`,
        type: 'type-collect',
        target: 1,
        current: 0,
        reward: 50,
        completed: false,
        claimed: false,
        targetType: randomType
      },
      {
        id: 'm3',
        description: 'Win tactical simulations in the Battle Frontier.',
        type: 'battle',
        target: 2,
        current: 0,
        reward: 60,
        completed: false,
        claimed: false
      }
    ];
    await db.saveMissions(newMissions);
    await db.setLastMissionRefresh(Date.now());
    setMissions(newMissions);
  }, []);

  const trackProgress = useCallback(async (type: Mission['type'], amount: number = 1, metadata?: any) => {
    const updatedMissions = missions.map(m => {
      if (m.claimed) return m;
      let match = false;
      if (m.type === type) {
        if (type === 'type-collect' && metadata?.types) {
          match = metadata.types.includes(m.targetType);
        } else {
          match = true;
        }
      }

      if (match) {
        const nextCount = m.current + amount;
        return {
          ...m,
          current: nextCount,
          completed: nextCount >= m.target
        };
      }
      return m;
    });

    setMissions(updatedMissions);
    await db.saveMissions(updatedMissions);
  }, [missions]);

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [initialTokens, initialPokemons, initialTeams, initialMissions, lastRefresh] = await Promise.all([
        db.getTokens(),
        db.getAllPokemons(),
        db.getAllTeams(),
        db.getMissions(),
        db.getLastMissionRefresh()
      ]);
      
      setTokens(initialTokens);
      setPokemons(initialPokemons);
      setTeams(initialTeams);

      const oneDay = 24 * 60 * 60 * 1000;
      if (Date.now() - lastRefresh > oneDay || initialMissions.length === 0) {
        await refreshMissions();
      } else {
        setMissions(initialMissions);
      }
    } catch (e) {
      setError('Failed to load data from your browser.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [refreshMissions]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);
  
  const handleGeneratePokemon = async () => {
    if (tokens < GENERATE_COST) {
      setError(`Not enough tokens! You need ${GENERATE_COST}.`);
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const newTokens = tokens - GENERATE_COST;
      const generatedPokemonData = await api.generatePokemon();
      const newPokemon = await db.addPokemon(generatedPokemonData);
      await db.setTokens(newTokens);
      setTokens(newTokens);
      setPokemons(prev => [newPokemon, ...prev]);

      // Track Mission Progress
      trackProgress('collect', 1);
      if (newPokemon.types) trackProgress('type-collect', 1, { types: newPokemon.types });
      
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTeam = async () => {
    const teamCost = GENERATE_COST * 6;
    if (tokens < teamCost) {
      setError(`Not enough tokens! You need ${teamCost}.`);
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const newTokens = tokens - teamCost;
      const generatedPokemonDataArray = await api.generateTeamOfPokemon();
      const newPokemons = await Promise.all(generatedPokemonDataArray.map(p => db.addPokemon(p)));
      
      await db.setTokens(newTokens);
      setTokens(newTokens);
      setPokemons(prev => [...newPokemons, ...prev]);

      // Track Mission Progress
      trackProgress('collect', 6);
      newPokemons.forEach(p => {
        if (p.types) trackProgress('type-collect', 1, { types: p.types });
      });

    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClaimMission = async (mission: Mission) => {
    if (!mission.completed || mission.claimed) return;
    const newTokens = tokens + mission.reward;
    const updatedMissions = missions.map(m => m.id === mission.id ? { ...m, claimed: true } : m);
    setMissions(updatedMissions);
    await db.saveMissions(updatedMissions);
    await handleUpdateTokens(mission.reward);
  };

  const updateSinglePokemonState = (updatedPokemon: Pokemon) => {
    setPokemons(prev => prev.map(p => p.id === updatedPokemon.id ? updatedPokemon : p));
  };
  
  const handleUpdateTokens = async (amount: number) => {
    const newTokens = tokens + amount;
    await db.setTokens(newTokens);
    setTokens(newTokens);
  };

  const openModal = (state: ModalState, data?: any) => {
    if (data?.pokemon) setSelectedPokemon(data.pokemon);
    if (data?.team) setSelectedTeam(data.team);
    setModalState(state);
  };

  const closeModal = () => {
    setModalState('none');
    setSelectedPokemon(null);
    setSelectedTeam(null);
    setNewTeamName('');
    setError(null);
  };

  const handleResellConfirm = async () => {
    if (!selectedPokemon) return;
    const resellValue = RESELL_VALUES[selectedPokemon.rarity];
    const newTokens = tokens + resellValue;
    const updatedPokemon = { ...selectedPokemon, status: PokemonStatus.SOLD };
    try {
        await db.updatePokemon(updatedPokemon);
        await db.setTokens(newTokens);
        setTokens(newTokens);
        setPokemons(prev => prev.filter(p => p.id !== selectedPokemon.id));
        handlePokemonRemovalFromTeams(selectedPokemon.id);
        trackProgress('sell', 1);
    } catch (e) {
        setError('Failed to resell Pokémon.');
    } finally {
        closeModal();
    }
  };

  const handleDeletePokemonConfirm = async () => {
    if (!selectedPokemon) return;
    try {
        await db.deletePokemon(selectedPokemon.id);
        setPokemons(prev => prev.filter(p => p.id !== selectedPokemon.id));
        handlePokemonRemovalFromTeams(selectedPokemon.id);
    } catch (e) {
        setError('Failed to delete Pokémon.');
    } finally {
        closeModal();
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
        setError("Team name cannot be empty.");
        return;
    }
    try {
        const newTeam = await db.addTeam(newTeamName.trim());
        setTeams(prev => [...prev, newTeam]);
    } catch (e) {
        setError('Failed to create team.');
    } finally {
        closeModal();
    }
  };
  
  const handleDeleteTeamConfirm = async () => {
    if (!selectedTeam) return;
    try {
      await db.deleteTeam(selectedTeam.id);
      setTeams(prev => prev.filter(t => t.id !== selectedTeam.id));
    } catch (e) {
      setError('Failed to delete team.');
    } finally {
      closeModal();
    }
  };
  
  const handleAddPokemonToTeam = async (pokemonId: number, teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || team.pokemonIds.length >= MAX_POKEMON_PER_TEAM || team.pokemonIds.includes(pokemonId)) return;
    const updatedTeam = { ...team, pokemonIds: [...team.pokemonIds, pokemonId] };
    try {
      await db.updateTeam(updatedTeam);
      setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));
    } catch (e) {
      setError('Failed to add Pokémon to team.');
    }
  };

  const handleRemovePokemonFromTeam = async (pokemonId: number, teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const updatedTeam = { ...team, pokemonIds: team.pokemonIds.filter(id => id !== pokemonId) };
    try {
      await db.updateTeam(updatedTeam);
      setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));
    } catch (e) {
      setError('Failed to remove Pokémon from team.');
    }
  };

  const handlePokemonRemovalFromTeams = (pokemonId: number) => {
    const updatedTeams: Team[] = [];
    let needsUpdate = false;
    teams.forEach(team => {
        if (team.pokemonIds.includes(pokemonId)) {
            needsUpdate = true;
            const updatedTeam = { ...team, pokemonIds: team.pokemonIds.filter(id => id !== pokemonId) };
            updatedTeams.push(updatedTeam);
            db.updateTeam(updatedTeam);
        } else updatedTeams.push(team);
    });
    if (needsUpdate) setTeams(updatedTeams);
  };

  const renderContent = () => {
    if (isLoading) return <div className="text-center p-10"><LoaderIcon className="w-12 h-12 animate-spin mx-auto"/></div>;

    if (activeTab === 'pokedex') {
      return (
        <>
          <MissionCenter missions={missions} onClaim={handleClaimMission} />
          
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 text-center">
            <h2 className="text-2xl font-bold mb-2">Generate New Pokémon!</h2>
            <p className="text-slate-400 mb-4">Generate a single Pokémon for {GENERATE_COST} tokens or a whole team of six.</p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button onClick={handleGeneratePokemon} disabled={isGenerating || tokens < GENERATE_COST} className="w-full md:w-auto">
                {isGenerating ? <LoaderIcon className="w-5 h-5 animate-spin"/> : <SparklesIcon className="w-5 h-5" />}
                {isGenerating ? 'Generating...' : `Generate Pokémon (${GENERATE_COST})`}
              </Button>
              <Button onClick={handleGenerateTeam} disabled={isGenerating || tokens < GENERATE_COST * 6} className="w-full md:w-auto" variant="secondary">
                {isGenerating ? <LoaderIcon className="w-5 h-5 animate-spin"/> : <SparklesIcon className="w-5 h-5" />}
                {isGenerating ? 'Generating...' : `Generate Team (${GENERATE_COST * 6})`}
              </Button>
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-3xl font-bold mb-4">My Collection ({pokemons.length})</h2>
            {pokemons.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {pokemons.map(p => (
                    <PokemonCard 
                      key={p.id} 
                      pokemon={p} 
                      teams={teams}
                      onResell={(pokemon) => openModal('confirm-resell', { pokemon })}
                      onDelete={(pokemon) => openModal('confirm-delete-pokemon', { pokemon })}
                      onAddToTeam={handleAddPokemonToTeam}
                    />
                  ))}
                </div>
            ) : <p className="text-slate-400 text-center py-8">Your Pokémon collection is empty. Generate some!</p>}
          </div>
        </>
      );
    }

    if (activeTab === 'teams') {
        return (
            <>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">My Teams ({teams.length})</h2>
                    <Button onClick={() => openModal('create-team')}><PlusIcon className="w-5 h-5"/> Create Team</Button>
                </div>
                {teams.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {teams.map(t => (
                            <TeamCard 
                                key={t.id} 
                                team={t} 
                                pokemons={pokemons}
                                onDelete={(teamId) => openModal('confirm-delete-team', { team: t })}
                                onRemoveFromTeam={handleRemovePokemonFromTeam}
                            />
                        ))}
                    </div>
                ) : <p className="text-slate-400 text-center py-8">You haven't created any teams yet.</p>}
            </>
        )
    }

    if (activeTab === 'battle') return <BattleTab teams={teams} allPokemons={pokemons} updatePokemonInDb={db.updatePokemon} updatePokemonInState={updateSinglePokemonState} setError={setError} onVictory={() => trackProgress('battle', 1)} />;
    if (activeTab === 'gamecorner') return <GameCornerTab onWinTokens={handleUpdateTokens} />;
    if (activeTab === 'professor') return <ProfessorTab tokens={tokens} teams={teams} allPokemons={pokemons} onPokemonGenerated={(p) => { setPokemons(prev => [p, ...prev]); trackProgress('collect', 1); if (p.types) trackProgress('type-collect', 1, { types: p.types }); }} onUpdateTokens={handleUpdateTokens} />;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <Header tokens={tokens} />
      <main className="container mx-auto p-4 md:p-6">
        {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
                <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3"><XIcon className="w-5 h-5"/></button>
            </div>
        )}

        <div className="flex space-x-2 border-b border-slate-700 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setActiveTab('pokedex')} className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors whitespace-nowrap ${activeTab === 'pokedex' ? 'border-b-2 border-poke-yellow text-poke-yellow' : 'text-slate-400 hover:text-white'}`}>
                <BookUserIcon className="w-5 h-5"/> Pokédex
            </button>
            <button onClick={() => setActiveTab('professor')} className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors whitespace-nowrap ${activeTab === 'professor' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                <SparklesIcon className="w-5 h-5"/> Professor
            </button>
            <button onClick={() => setActiveTab('teams')} className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors whitespace-nowrap ${activeTab === 'teams' ? 'border-b-2 border-poke-yellow text-poke-yellow' : 'text-slate-400 hover:text-white'}`}>
                <ShieldIcon className="w-5 h-5"/> Teams
            </button>
            <button onClick={() => setActiveTab('battle')} className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors whitespace-nowrap ${activeTab === 'battle' ? 'border-b-2 border-poke-yellow text-poke-yellow' : 'text-slate-400 hover:text-white'}`}>
                <SwordsIcon className="w-5 h-5"/> Battle
            </button>
             <button onClick={() => setActiveTab('gamecorner')} className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors whitespace-nowrap ${activeTab === 'gamecorner' ? 'border-b-2 border-poke-yellow text-poke-yellow' : 'text-slate-400 hover:text-white'}`}>
                <TicketIcon className="w-5 h-5"/> Game Corner
            </button>
        </div>

        {renderContent()}
      </main>

      <Modal isOpen={modalState === 'confirm-resell'} onClose={closeModal} title="Confirm Resell">
          <p>Are you sure you want to resell {selectedPokemon?.name} for {selectedPokemon && RESELL_VALUES[selectedPokemon.rarity]} tokens?</p>
          <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" onClick={handleResellConfirm}>Resell</Button>
          </div>
      </Modal>

      <Modal isOpen={modalState === 'confirm-delete-pokemon'} onClose={closeModal} title="Confirm Delete">
          <p>Are you sure you want to permanently delete {selectedPokemon?.name}? This action cannot be undone.</p>
          <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button variant="danger" onClick={handleDeletePokemonConfirm}>Delete</Button>
          </div>
      </Modal>

      <Modal isOpen={modalState === 'create-team'} onClose={closeModal} title="Create New Team">
          <form onSubmit={handleCreateTeam}>
              <label htmlFor="teamName" className="block text-sm font-medium text-slate-300 mb-2">Team Name</label>
              <input type="text" id="teamName" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-poke-yellow focus:outline-none" placeholder="e.g., Team Rocket" autoFocus />
              <div className="mt-6 flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                  <Button type="submit">Create</Button>
              </div>
          </form>
      </Modal>

      <Modal isOpen={modalState === 'confirm-delete-team'} onClose={closeModal} title="Confirm Delete Team">
          <p>Are you sure you want to delete the team "{selectedTeam?.name}"? This will not delete the Pokémon in it.</p>
          <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteTeamConfirm}>Delete Team</Button>
          </div>
      </Modal>
    </div>
  );
};

export default App;