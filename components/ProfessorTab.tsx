
import React, { useState } from 'react';
import Button from './Button';
import { LoaderIcon, SparklesIcon, ShieldIcon, BookUserIcon, PokeballIcon } from './icons';
import * as api from '../services/pokemonApiService';
import * as db from '../services/indexedDbService';
import type { Pokemon, Team } from '../types';
import { GENERATE_COST } from '../constants';
import Modal from './Modal';

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
  const [latestPokemon, setLatestPokemon] = useState<Pokemon | null>(null);

  const handleSpecGeneration = async () => {
    if (tokens < GENERATE_COST || !spec.trim()) return;
    
    setIsBusy(true);
    setStatus('Analyzing Spec...');
    try {
      const newPokemonData = await api.generatePokemon(spec);
      setStatus('Synthesizing DNA...');
      const savedPokemon = await db.addPokemon(newPokemonData);
      onUpdateTokens(-GENERATE_COST);
      onPokemonGenerated(savedPokemon);
      setLatestPokemon(savedPokemon);
      setSpec('');
      setStatus('Synthesis Complete!');
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
    try {
      const report = await api.analyzeTeamSynergy(teamPokemons);
      setAnalysis(report);
    } catch (e) {
      setAnalysis("The Professor is busy.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* DNA Lab DNA Terminal */}
      <div className="bg-slate-900/80 p-8 rounded-3xl border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 animate-pulse" />
        
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-cyan-500/20 rounded-2xl text-cyan-400 border border-cyan-500/30">
            <SparklesIcon className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-4xl font-black italic text-cyan-400 tracking-tight">DNA COUPLER</h2>
            <p className="text-xs font-mono text-cyan-600 uppercase tracking-widest">Version 2.5.4-FLASH</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <textarea
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="Input Spec: e.g. 'A lightning bird made of chrome'..."
              className="w-full h-40 bg-black/40 border border-slate-700 rounded-2xl p-5 text-cyan-100 placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none font-mono text-sm"
              disabled={isBusy}
            />
            {isBusy && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                  <span className="text-cyan-400 font-mono text-xs animate-pulse">{status}</span>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={handleSpecGeneration} 
            disabled={isBusy || !spec.trim() || tokens < GENERATE_COST}
            className="w-full py-5 text-xl font-bold bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.02]"
          >
            {isBusy ? 'INITIALIZING...' : `START SYNTHESIS (${GENERATE_COST})`}
          </Button>
        </div>
      </div>

      {/* Lab Results / Synergy */}
      <div className="space-y-8">
        <div className="bg-slate-900/80 p-8 rounded-3xl border border-purple-500/40 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-purple-500/20 rounded-2xl text-purple-400 border border-purple-500/30">
              <ShieldIcon className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-4xl font-black italic text-purple-400 tracking-tight">SYNERGY ANALYZER</h2>
              <p className="text-xs font-mono text-purple-600 uppercase tracking-widest">Strategic Tactical Unit</p>
            </div>
          </div>

          <select 
            className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-purple-100 mb-6 font-mono text-sm focus:border-purple-500 transition-all outline-none"
            onChange={(e) => setSelectedTeamId(Number(e.target.value))}
            value={selectedTeamId || ''}
          >
            <option value="">-- SELECT TEAM CORE --</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
          </select>

          <Button 
            variant="secondary" 
            onClick={handleAnalyzeTeam} 
            disabled={isBusy || selectedTeamId === null}
            className="w-full py-4 border-purple-500 text-purple-400 hover:bg-purple-500/10"
          >
            {isBusy ? <LoaderIcon className="animate-spin" /> : 'EXECUTE SCAN'}
          </Button>

          {analysis && (
            <div className="mt-8 bg-black/40 p-6 rounded-2xl border border-purple-500/20 animate-fade-in">
              <h4 className="text-purple-400 font-bold mb-3 flex items-center gap-2 text-sm uppercase">
                <BookUserIcon className="w-4 h-4" /> Processor Analysis Result:
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed italic">{analysis}</p>
            </div>
          )}
        </div>
      </div>

      {/* Synthesis Report Modal */}
      <Modal 
        isOpen={!!latestPokemon} 
        onClose={() => setLatestPokemon(null)} 
        title="DNA SYNTHESIS REPORT"
      >
        {latestPokemon && (
          <div className="space-y-6">
            <div className="flex items-center gap-6 bg-cyan-900/20 p-4 rounded-2xl border border-cyan-500/20">
              <img src={latestPokemon.imageUrl} className="w-24 h-24 rounded-lg bg-black/40 p-2" />
              <div>
                <h3 className="text-2xl font-black text-cyan-400">{latestPokemon.name}</h3>
                <p className="text-xs font-mono text-cyan-600">SUCCESSFULLY SYNTHESIZED</p>
              </div>
            </div>
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700">
              <h4 className="text-poke-yellow text-xs font-black uppercase mb-3 flex items-center gap-2">
                <PokeballIcon className="w-4 h-4" /> Professor's Design Validation:
              </h4>
              <p className="text-sm text-slate-300 italic leading-relaxed">
                {latestPokemon.synthesisReport || "The synthesis was successful, though no specific design report was logged for this specimen."}
              </p>
            </div>
            <Button onClick={() => setLatestPokemon(null)} className="w-full bg-cyan-600">CONFIRM AND CLOSE</Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProfessorTab;
