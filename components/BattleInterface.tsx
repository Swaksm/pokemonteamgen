
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

const BattleInterface: React.FC<BattleInterfaceProps> = ({ playerTeam, opponentTeam, onBattleEnd }) => {
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
    if (typeMultiplier > 1) addLog("It's super effective!");
    else if (typeMultiplier < 1 && typeMultiplier > 0) addLog("It's not very effective...");
    else if (typeMultiplier === 0) addLog("It had no effect!");
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
              addLog(winner === 'victory' ? "You are victorious!" : "You have been defeated!");
              setTurnState('ended');
              battleEnded = true;
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
          const text = await api.getBattleAdvice(playerActive, opponentActive, battleLog);
          setAdvice(text);
      } catch (e) {
          setAdvice("No tactical advice available.");
      } finally {
          setIsGettingAdvice(false);
      }
  };

  const renderPokemonDisplay = (pokemon: BattlePokemon, isOpponent: boolean) => (
    <div className={`absolute w-1/2 md:w-1/3 max-w-xs ${isOpponent ? 'top-4 right-4 text-right' : 'bottom-[210px] left-4'}`}>
        <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700 mb-2 inline-block">
            <HealthBar currentHp={pokemon.currentHp} maxHp={pokemon.stats.hp} label={pokemon.name} />
            <div className={`flex gap-1 mt-1 ${isOpponent ? 'justify-end' : 'justify-start'}`}>
                {pokemon.types.map(type => <TypeBadge key={type} type={type} />)}
            </div>
        </div>
        <div className={`relative h-32 md:h-40 ${isOpponent ? 'mr-4' : 'ml-4'}`}>
            <img src={pokemon.imageUrl} alt={pokemon.name} className={`absolute inset-0 h-full w-full object-contain drop-shadow-lg transition-transform duration-300 ${((isOpponent && opponentAnim.damage) || (!isOpponent && playerAnim.damage)) ? 'animate-pulse-fast' : ''} ${((isOpponent && opponentAnim.attack) || (!isOpponent && playerAnim.attack)) ? (isOpponent ? 'translate-x-[-20px]' : 'translate-x-[20px]') : ''} ${pokemon.currentHp <= 0 ? 'opacity-50 grayscale' : ''}`} />
        </div>
    </div>
  );
  
  const renderActionPanel = () => {
    if (turnState === 'processing') return <div className="flex items-center justify-center h-full"><LoaderIcon className="w-8 h-8 animate-spin text-poke-yellow" /></div>;
    if (turnState !== 'player_input') return <div className="flex items-center justify-center h-full"><p className="text-slate-400">...</p></div>;

    if (actionView === 'fight') {
        return (
            <div className="grid grid-cols-2 gap-2 h-full">
                {playerActive.attacks.map(attack => (
                    <Button key={attack.name} onClick={() => processTurn({ type: 'attack', move: attack })} className="flex-col !gap-0 !items-start !text-left p-2">
                        <div>{attack.name}</div>
                        <div className="text-xs opacity-80 flex items-center gap-2"><TypeBadge type={attack.type} small /> <span>{attack.power} Pwr</span></div>
                    </Button>
                ))}
                <Button variant="ghost" onClick={() => setActionView('main')} className="col-span-2"><ChevronLeftIcon className="w-4 h-4" /> Back</Button>
            </div>
        );
    }
    if (actionView === 'pokemon') {
        return (
            <div className="grid grid-cols-2 gap-2 h-full overflow-y-auto">
                {playerParty.map(p => (
                    <Button key={p.id} variant="secondary" onClick={() => handlePlayerSwitch(p)} disabled={p.currentHp <= 0 || p.id === playerActive.id}>
                    {p.name} ({p.currentHp > 0 ? `${p.currentHp} HP` : 'Fainted'})
                    </button>
                ))}
                {!isForcedSwitch && <Button variant="ghost" onClick={() => setActionView('main')} className="col-span-2"><ChevronLeftIcon className="w-4 h-4" /> Back</Button>}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-2 gap-2 h-full">
            <Button onClick={() => setActionView('fight')} className="h-full text-xl">Fight</Button>
            <Button variant="secondary" onClick={() => setActionView('pokemon')} className="h-full text-xl">Pokémon</Button>
            <Button variant="ghost" onClick={handleGetAdvice} disabled={isGettingAdvice} className="col-span-2 text-cyan-400 border border-cyan-500/30">
                {isGettingAdvice ? <LoaderIcon className="animate-spin w-4 h-4" /> : <SparklesIcon className="w-4 h-4" />}
                Ask Professor
            </Button>
        </div>
    );
  };

  return (
    <div className="bg-slate-900/50 rounded-lg border-2 border-slate-700 relative overflow-hidden" style={{ height: '75vh', minHeight: '550px' }}>
      {/* Professor Advice HUD */}
      {advice && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-cyan-900/80 backdrop-blur-md border border-cyan-500 p-4 rounded-xl shadow-xl w-3/4 max-w-lg animate-fade-in">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-cyan-400 font-bold uppercase text-xs flex items-center gap-2"><SparklesIcon className="w-3 h-3"/> Tactical Advice:</h4>
                <button onClick={() => setAdvice(null)} className="text-white/50 hover:text-white">&times;</button>
              </div>
              <p className="text-sm text-cyan-100 italic">{advice}</p>
          </div>
      )}

      <div className="absolute top-4 left-4 w-1/3 z-10"><PartyStatus party={opponentParty} /></div>
      {renderPokemonDisplay(opponentActive, true)}
      <div className="absolute bottom-[210px] right-4 w-1/3 z-10"><PartyStatus party={playerParty} isOpponent/></div>
      {renderPokemonDisplay(playerActive, false)}
      <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-slate-800 border-t-4 border-slate-600 p-4 grid grid-cols-2 gap-4">
        <div ref={logContainerRef} className="bg-slate-900 rounded-md p-2 text-sm font-mono overflow-y-auto border border-slate-700 h-full">
            {battleLog.map((msg, i) => <p key={i} className="py-1 animate-fade-in">{msg}</p>)}
        </div>
        <div className="h-full">{renderActionPanel()}</div>
      </div>
      <Modal isOpen={!!outcome} onClose={() => {}} title={outcome === 'victory' ? 'Victory!' : 'Defeat!'}>
        <p className="text-center mb-6">{outcome === 'victory' ? "Congratulations! You won the battle." : "Your team fought bravely but was defeated."}</p>
        <Button onClick={onBattleEnd} className="w-full">Back to Team Selection</Button>
      </Modal>
    </div>
  );
};

export default BattleInterface;
