
import React, { useState, useEffect, useRef } from 'react';
import type { Pokemon, Attack, PokemonStats, PokemonType } from '../types';
import { AttackCategory, PokemonType as PokemonTypeEnum } from '../types';
import { typeChart } from '../data/typeChart';
import Button from './Button';
import HealthBar from './HealthBar';
import Modal from './Modal';
import PartyStatus from './PartyStatus';
import TypeBadge from './TypeBadge';
import { LoaderIcon, ChevronLeftIcon, SparklesIcon } from './icons';
import * as api from '../services/pokemonApiService';

interface BattleInterfaceProps {
  playerTeam: Pokemon[];
  opponentTeam: Pokemon[];
  onBattleEnd: () => void;
  onVictory?: () => void;
}

type BattlePokemon = Pokemon & { 
    currentHp: number; 
    stats: PokemonStats;
    types: PokemonType[];
    attacks: Attack[];
};
type ActionView = 'main' | 'fight' | 'pokemon';
type PlayerAction = { type: 'attack', move: Attack } | { type: 'switch', pokemonId: number };
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const sanitizePokemonForBattle = (pokemon: Pokemon): BattlePokemon => {
    const stats: PokemonStats = {
      hp: Number(pokemon.stats?.hp) || 100,
      attack: Number(pokemon.stats?.attack) || 50,
      defense: Number(pokemon.stats?.defense) || 50,
      specialAttack: Number(pokemon.stats?.specialAttack) || 50,
      specialDefense: Number(pokemon.stats?.specialDefense) || 50,
      speed: Number(pokemon.stats?.speed) || 50,
    };
    const types: PokemonType[] = pokemon.types && pokemon.types.length > 0 ? pokemon.types : [PokemonTypeEnum.NORMAL];
    const defaultAttack: Attack = { name: 'Tackle', type: PokemonTypeEnum.NORMAL, category: AttackCategory.PHYSICAL, power: 40, accuracy: 100 };
    let attacks: Attack[] = pokemon.attacks && pokemon.attacks.length > 0 ? [...pokemon.attacks] : [];
    while (attacks.length < 4) attacks.push(defaultAttack);
    return { ...pokemon, stats, types, attacks: attacks.slice(0, 4), currentHp: stats.hp };
};

const BattleInterface: React.FC<BattleInterfaceProps> = ({ playerTeam, opponentTeam, onBattleEnd, onVictory }) => {
  const [initialState] = useState(() => {
    const pParty = playerTeam.map(sanitizePokemonForBattle);
    const oParty = opponentTeam.map(sanitizePokemonForBattle);
    return {
      playerParty: pParty,
      opponentParty: oParty,
      playerActive: pParty.find(p => p.currentHp > 0)!,
      opponentActive: oParty.find(p => p.currentHp > 0)!,
    };
  });

  const [playerParty, setPlayerParty] = useState<BattlePokemon[]>(initialState.playerParty);
  const [opponentParty, setOpponentParty] = useState<BattlePokemon[]>(initialState.opponentParty);
  const [playerActive, setPlayerActive] = useState<BattlePokemon>(initialState.playerActive);
  const [opponentActive, setOpponentActive] = useState<BattlePokemon>(initialState.opponentActive);

  const [battleLog, setBattleLog] = useState<string[]>(['The battle begins!']);
  const [outcome, setOutcome] = useState<'victory' | 'defeat' | null>(null);
  const [turnState, setTurnState] = useState<'player_input' | 'processing' | 'ended'>('player_input');
  const [actionView, setActionView] = useState<ActionView>('main');
  const [isForcedSwitch, setIsForcedSwitch] = useState(false);
  const [playerAnim, setPlayerAnim] = useState({ damage: false, attack: false });
  const [opponentAnim, setOpponentAnim] = useState({ damage: false, attack: false });
  const [advice, setAdvice] = useState<string | null>(null);
  const [recommendedMoveName, setRecommendedMoveName] = useState<string | null>(null);
  const [isGettingAdvice, setIsGettingAdvice] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [battleLog]);

  const addLog = (message: string) => setBattleLog(prev => [...prev.slice(-10), message]);

  const calculateDamage = (attacker: BattlePokemon, defender: BattlePokemon, move: Attack) => {
    if (move.power === 0) return 0;
    const isSpecial = move.category === AttackCategory.SPECIAL;
    const attackStat = isSpecial ? attacker.stats.specialAttack : attacker.stats.attack;
    const defenseStat = isSpecial ? defender.stats.specialDefense : defender.stats.defense;
    let typeMultiplier = 1;
    for (const defenderType of defender.types) typeMultiplier *= typeChart[move.type]?.[defenderType] ?? 1;
    const stabMultiplier = attacker.types.includes(move.type) ? 1.5 : 1;
    const randomMultiplier = Math.random() * (1 - 0.85) + 0.85;
    const baseDamage = (( (2/5 + 2) * move.power * (attackStat / defenseStat) ) / 50) + 2;
    const finalDamage = Math.floor(baseDamage * stabMultiplier * typeMultiplier * randomMultiplier);
    return finalDamage;
  };

  const executeAttack = (attacker: BattlePokemon, defender: BattlePokemon, move: Attack) => {
    addLog(`${attacker.name} used ${move.name}!`);
    if (Math.random() * 100 > move.accuracy) {
        addLog(`${attacker.name}'s attack missed!`);
        return { fainted: false, damage: 0 };
    }
    const damage = calculateDamage(attacker, defender, move);
    const newHp = Math.max(0, defender.currentHp - damage);
    return { fainted: newHp <= 0, damage, newHp };
  };

  const processTurn = async (playerAction: PlayerAction) => {
    setTurnState('processing');
    setActionView('main');
    setAdvice(null);
    setRecommendedMoveName(null);
    
    const opponentMove = opponentActive.attacks[Math.floor(Math.random() * opponentActive.attacks.length)];
    const opponentAction = { type: 'attack', move: opponentMove } as const;
    const playerGoesFirst = playerAction.type === 'switch' || (playerAction.type === 'attack' && playerActive.stats.speed >= opponentActive.stats.speed);
    const turnOrder = playerGoesFirst
      ? [{ actor: 'player', action: playerAction }, { actor: 'opponent', action: opponentAction }]
      : [{ actor: 'opponent', action: opponentAction }, { actor: 'player', action: playerAction }];

    let battleEnded = false;
    for (const turn of turnOrder) {
      if (battleEnded) break;
      let currentAttacker: BattlePokemon, currentDefender: BattlePokemon, action: PlayerAction | typeof opponentAction;
      let setAttacker: React.Dispatch<React.SetStateAction<BattlePokemon>>, setDefender: React.Dispatch<React.SetStateAction<BattlePokemon>>;
      let setAttackerParty: React.Dispatch<React.SetStateAction<BattlePokemon[]>>, setDefenderParty: React.Dispatch<React.SetStateAction<BattlePokemon[]>>;
      let setAttackerAnim: React.Dispatch<React.SetStateAction<{ damage: boolean, attack: boolean }>>, setDefenderAnim: React.Dispatch<React.SetStateAction<{ damage: boolean, attack: boolean }>>;

      if (turn.actor === 'player') {
        [currentAttacker, currentDefender, action] = [playerActive, opponentActive, turn.action];
        [setAttacker, setDefender] = [setPlayerActive, setOpponentActive];
        [setAttackerParty, setDefenderParty] = [setPlayerParty, setOpponentParty];
        [setAttackerAnim, setDefenderAnim] = [setPlayerAnim, setOpponentAnim];
      } else {
        [currentAttacker, currentDefender, action] = [opponentActive, playerActive, turn.action];
        [setAttacker, setDefender] = [setOpponentActive, setPlayerActive];
        [setAttackerParty, setDefenderParty] = [setOpponentParty, setPlayerParty];
        [setAttackerAnim, setDefenderAnim] = [setOpponentAnim, setPlayerAnim];
      }
      
      if (currentAttacker.currentHp <= 0) continue;

      if (action.type === 'attack') {
        setAttackerAnim(prev => ({...prev, attack: true}));
        await wait(300);
        const { fainted, newHp } = executeAttack(currentAttacker, currentDefender, action.move);
        setDefenderAnim(prev => ({...prev, damage: true}));
        await wait(300);
        setAttackerAnim(prev => ({...prev, attack: false}));
        setDefenderAnim(prev => ({...prev, damage: false}));
        setDefender(prev => ({ ...prev, currentHp: newHp! }));
        setDefenderParty(prev => prev.map(p => p.id === currentDefender.id ? { ...p, currentHp: newHp! } : p));
        
        if (fainted) {
            addLog(`${currentDefender.name} fainted!`);
            const remaining = (turn.actor === 'player' ? opponentParty : playerParty).filter(p => p.id !== currentDefender.id && p.currentHp > 0);
            if (remaining.length === 0) {
              const winner = turn.actor === 'player' ? 'victory' : 'defeat';
              setOutcome(winner);
              setTurnState('ended');
              battleEnded = true;
              if (winner === 'victory' && onVictory) onVictory();
            } else {
                if (turn.actor === 'player') {
                    const nextOpponent = remaining.find(p => p.currentHp > 0)!;
                    await wait(1000);
                    setOpponentActive(nextOpponent);
                    addLog(`Opponent sent out ${nextOpponent.name}!`);
                } else {
                    setIsForcedSwitch(true);
                    setActionView('pokemon');
                    setTurnState('player_input');
                    return;
                }
            }
        }
      } else if (action.type === 'switch') {
          const newPokemon = playerParty.find(p => p.id === action.pokemonId)!;
          setPlayerActive(newPokemon);
          addLog(`You switched to ${newPokemon.name}!`);
          await wait(1000);
      }
    }
    if (!battleEnded) setTurnState('player_input');
  };

  const handlePlayerSwitch = (pokemon: BattlePokemon) => {
    if (pokemon.id === playerActive.id || pokemon.currentHp <= 0 || turnState === 'processing') return;
    if (isForcedSwitch) {
        setIsForcedSwitch(false);
        setPlayerActive(pokemon);
        addLog(`Go, ${pokemon.name}!`);
        setTurnState('player_input');
        setActionView('main');
    } else processTurn({ type: 'switch', pokemonId: pokemon.id });
  };

  const handleGetAdvice = async () => {
      setIsGettingAdvice(true);
      try {
          const result = await api.getBattleAdvice(playerActive, opponentActive, battleLog);
          setAdvice(result.advice);
          setRecommendedMoveName(result.recommendedMove);
      } catch (e) {
          setAdvice("Professor is analyzing data...");
      } finally {
          setIsGettingAdvice(false);
      }
  };

  const renderPokemonDisplay = (pokemon: BattlePokemon, isOpponent: boolean) => (
    <div className={`absolute w-1/2 md:w-1/3 max-w-xs ${isOpponent ? 'top-4 right-4 text-right' : 'bottom-[210px] left-4'}`}>
        <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-xl mb-3 inline-block min-w-[180px]">
            <HealthBar currentHp={pokemon.currentHp} maxHp={pokemon.stats.hp} label={pokemon.name} />
            <div className={`flex gap-1 mt-2 ${isOpponent ? 'justify-end' : 'justify-start'}`}>
                {pokemon.types.map(type => <TypeBadge key={type} type={type} />)}
            </div>
        </div>
        <div className={`relative h-40 md:h-52 ${isOpponent ? 'mr-4' : 'ml-4'}`}>
            <img 
              src={pokemon.imageUrl} 
              alt={pokemon.name} 
              className={`absolute inset-0 h-full w-full object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 ${((isOpponent && opponentAnim.damage) || (!isOpponent && playerAnim.damage)) ? 'animate-pulse scale-95 brightness-150' : ''} ${((isOpponent && opponentAnim.attack) || (!isOpponent && playerAnim.attack)) ? (isOpponent ? 'translate-x-[-30px] scale-110' : 'translate-x-[30px] scale-110') : ''} ${pokemon.currentHp <= 0 ? 'opacity-0 translate-y-10 scale-50 rotate-12' : 'opacity-100'}`} 
            />
        </div>
    </div>
  );
  
  const renderActionPanel = () => {
    if (turnState === 'processing') return <div className="flex flex-col items-center justify-center h-full gap-2"><LoaderIcon className="w-10 h-10 animate-spin text-cyan-400" /><span className="text-xs font-mono text-cyan-600 animate-pulse">PROCESSING...</span></div>;
    if (turnState !== 'player_input') return <div className="flex items-center justify-center h-full"><p className="text-slate-500 font-mono italic">Turn Cycle Complete</p></div>;

    if (actionView === 'fight') {
        return (
            <div className="grid grid-cols-2 gap-3 h-full">
                {playerActive.attacks.map(attack => {
                    const isRecommended = recommendedMoveName?.toLowerCase() === attack.name.toLowerCase();
                    return (
                        <Button 
                          key={attack.name} 
                          onClick={() => processTurn({ type: 'attack', move: attack })} 
                          className={`flex-col !gap-0 !items-start !text-left p-3 border-2 transition-all ${isRecommended ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] bg-cyan-900/20' : 'border-transparent'}`}
                        >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-bold">{attack.name}</span>
                              {isRecommended && <SparklesIcon className="w-4 h-4 text-cyan-400 animate-pulse" />}
                            </div>
                            <div className="text-xs opacity-80 flex items-center gap-2 mt-1"><TypeBadge type={attack.type} small /> <span>{attack.power} Pwr</span></div>
                        </Button>
                    );
                })}
                <Button variant="ghost" onClick={() => setActionView('main')} className="col-span-2 text-xs uppercase tracking-widest"><ChevronLeftIcon className="w-4 h-4" /> Return</Button>
            </div>
        );
    }
    if (actionView === 'pokemon') {
        return (
            <div className="grid grid-cols-2 gap-2 h-full overflow-y-auto">
                {playerParty.map(p => (
                    <Button key={p.id} variant="secondary" onClick={() => handlePlayerSwitch(p)} disabled={p.currentHp <= 0 || p.id === playerActive.id}>
                    {p.name} ({p.currentHp > 0 ? `${p.currentHp} HP` : 'KO'})
                    </button>
                ))}
                {!isForcedSwitch && <Button variant="ghost" onClick={() => setActionView('main')} className="col-span-2"><ChevronLeftIcon className="w-4 h-4" /> Return</Button>}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-2 gap-3 h-full">
            <Button onClick={() => setActionView('fight')} className="h-full text-2xl font-black italic bg-gradient-to-br from-poke-red to-red-800 text-white border-b-4 border-red-900 hover:scale-105 active:scale-95 transition-transform">FIGHT</Button>
            <Button variant="secondary" onClick={() => setActionView('pokemon')} className="h-full text-xl font-bold bg-slate-700">PARTY</Button>
            <Button 
                variant="ghost" 
                onClick={handleGetAdvice} 
                disabled={isGettingAdvice} 
                className="col-span-2 bg-cyan-900/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs uppercase tracking-tighter"
            >
                {isGettingAdvice ? <LoaderIcon className="animate-spin w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                Sync with Professor
            </Button>
        </div>
    );
  };

  return (
    <div className="bg-slate-950 rounded-3xl border-4 border-slate-800 relative overflow-hidden shadow-2xl" style={{ height: '75vh', minHeight: '600px' }}>
      {/* HUD Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_100%)]" />
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Professor Advice Overlay */}
      {advice && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-xl border border-cyan-500/50 p-5 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)] w-5/6 max-w-md animate-fade-in">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-cyan-400 font-black uppercase text-xs flex items-center gap-2 tracking-widest"><SparklesIcon className="w-3 h-3"/> COACHING UPLINK</h4>
                <button onClick={() => setAdvice(null)} className="text-white/40 hover:text-white transition-colors">&times;</button>
              </div>
              <p className="text-sm text-cyan-100 leading-relaxed font-mono italic">{advice}</p>
          </div>
      )}

      {/* Battle Entities */}
      <div className="absolute top-8 left-8 w-1/3 z-20"><PartyStatus party={opponentParty} /></div>
      {renderPokemonDisplay(opponentActive, true)}
      <div className="absolute bottom-[230px] right-8 w-1/3 z-20"><PartyStatus party={playerParty} isOpponent/></div>
      {renderPokemonDisplay(playerActive, false)}

      {/* Command Center */}
      <div className="absolute bottom-0 left-0 right-0 h-[220px] bg-slate-900/90 backdrop-blur-md border-t-2 border-slate-700 p-6 flex gap-6">
        <div ref={logContainerRef} className="flex-1 bg-black/60 rounded-xl p-4 text-xs font-mono overflow-y-auto border border-slate-800 scrollbar-hide text-slate-300">
            {battleLog.map((msg, i) => <p key={i} className="py-1 border-b border-slate-800/50 opacity-80 animate-fade-in">{`> ${msg}`}</p>)}
        </div>
        <div className="w-2/5 h-full">{renderActionPanel()}</div>
      </div>

      <Modal isOpen={!!outcome} onClose={() => {}} title={outcome === 'victory' ? 'VICTORY' : 'DEFEAT'}>
        <div className="text-center p-4">
          <p className="mb-8 text-slate-300 font-mono tracking-tight">{outcome === 'victory' ? "Enemy forces neutralized. Team performance: OPTIMAL." : "Team critical failure. Strategic retreat initiated."}</p>
          <Button onClick={onBattleEnd} className="w-full bg-poke-yellow text-slate-900 font-black italic">RETURN TO HQ</Button>
        </div>
      </Modal>
    </div>
  );
};

export default BattleInterface;
