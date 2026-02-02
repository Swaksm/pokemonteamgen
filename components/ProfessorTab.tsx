
import React, { useState } from 'react';
import Button from './Button';
import { LoaderIcon, SparklesIcon, ShieldIcon, BookUserIcon } from './icons';
import * as api from '../services/pokemonApiService';
import * as db from '../services/indexedDbService';
import type { Pokemon, Team } from '../types';
import { GENERATE_COST } from '../constants';

interface ProfessorTabProps {
  tokens: number;
  teams: Team[];
  allPokemons: Pokemon[];
  onPokemonGenerated: (p: Pokemon) => void;
  onUpdateTokens: (amount: number) => void;
}

const ProfessorTab: React.FC<ProfessorTabProps> = ({ tokens, teams, allPokemons, onPokemonGenerated, onUpdateTokens }) => {
  const [spec, setSpec] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const handleSpecGeneration = async () => {
    if (tokens < GENERATE_COST || !spec.trim()) return;
    
    setIsBusy(true);
    setStatus('Analyzing Specification...');
    try {
      const newPokemonData = await api.generatePokemon(spec);
      setStatus('Synthesizing DNA...');
      const savedPokemon = await db.addPokemon(newPokemonData);
      onUpdateTokens(-GENERATE_COST);
      onPokemonGenerated(savedPokemon);
      setSpec('');
      setStatus('Success!');
      setTimeout(() => setStatus(''), 3000);
    } catch (e) {
      console.error(e);
      setStatus('Error in Lab!');
    } finally {
      setIsBusy(false);
    }
  };

  const handleAnalyzeTeam = async () => {
    if (selectedTeamId === null) return;
    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) return;

    const teamPokemons = team.pokemonIds.map(id => allPokemons.find(p => p.id === id)).filter(Boolean) as Pokemon[];
    
    setIsBusy(true);
    setStatus('Analyzing Synergy...');
    try {
      const report = await api.analyzeTeamSynergy(teamPokemons);
      setAnalysis(report);
    } catch (e) {
      setAnalysis("The Professor is busy right now.");
    } finally {
      setIsBusy(false);
      setStatus('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Lab DNA Terminal */}
      <div className="bg-slate-800/80 p-8 rounded-2xl border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400">
            <SparklesIcon className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            PROFESSOR'S DNA LAB
          </h2>
        </div>

        <p className="text-slate-300 mb-6 leading-relaxed">
          Provide a detailed specification for your custom Pokémon. The Professor will attempt to synthesize its DNA using our advanced AI core.
        </p>

        <textarea
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
          placeholder="Describe your Pokemon: 'A stealthy dark/ice feline that uses shadows to teleport'..."
          className="w-full h-32 bg-slate-900 border-2 border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 transition-colors mb-6 resize-none"
          disabled={isBusy}
        />

        <div className="flex flex-col gap-4">
          <Button 
            onClick={handleSpecGeneration} 
            disabled={isBusy || !spec.trim() || tokens < GENERATE_COST}
            className="w-full py-4 text-lg bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-900/20"
          >
            {isBusy ? <LoaderIcon className="animate-spin w-6 h-6" /> : 'SYNTHESIZE POKEMON'}
          </Button>
          <div className="text-center">
            <span className="text-sm font-mono text-cyan-500/80">{status || `Cost: ${GENERATE_COST} Tokens`}</span>
          </div>
        </div>
      </div>

      {/* Strategic Analysis */}
      <div className="bg-slate-800/80 p-8 rounded-2xl border-2 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
        <div className="flex items-center gap-3 mb-6">
           <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
            <ShieldIcon className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            SYNERGY ANALYZER
          </h2>
        </div>

        <div className="mb-6">
          <label className="block text-slate-400 text-sm mb-2">Select Team to Analyze</label>
          <select 
            className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl p-4 text-white"
            onChange={(e) => setSelectedTeamId(Number(e.target.value))}
            value={selectedTeamId || ''}
          >
            <option value="">Choose a team...</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.pokemonIds.length} pkmn)</option>)}
          </select>
        </div>

        {analysis ? (
          <div className="bg-slate-900/80 p-6 rounded-xl border border-purple-500/30 mb-6 animate-fade-in">
             <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
               <BookUserIcon className="w-4 h-4" /> PROFESSOR'S REPORT:
             </h4>
             <p className="text-slate-200 text-sm italic line-height-relaxed">{analysis}</p>
             <button onClick={() => setAnalysis(null)} className="text-xs text-purple-500 hover:text-purple-400 mt-4 underline">Close Report</button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl mb-6">
            <ShieldIcon className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">Select a team and run analysis</p>
          </div>
        )}

        <Button 
          variant="secondary" 
          onClick={handleAnalyzeTeam} 
          disabled={isBusy || selectedTeamId === null}
          className="w-full py-4 text-lg border-purple-500 text-purple-400 hover:bg-purple-500/10"
        >
          {isBusy ? <LoaderIcon className="animate-spin w-6 h-6" /> : 'RUN SYNERGY CHECK'}
        </Button>
      </div>
    </div>
  );
};

export default ProfessorTab;
