
import React, { useState, useEffect } from 'react';
import Button from './Button';
import * as db from '../services/indexedDbService';
import { SparklesIcon, CoinsIcon, LoaderIcon, PokeballIcon } from './icons';

const WHEEL_SECTIONS = [
  { value: 5, color: '#10b981' }, { value: 20, color: '#f59e0b' },
  { value: 10, color: '#3b82f6' }, { value: 100, color: '#8b5cf6' },
  { value: 5, color: '#059669' }, { value: 50, color: '#f97316' },
  { value: 10, color: '#2563eb' }, { value: 20, color: '#d97706' },
];

const SPIN_COOLDOWN = 60 * 1000;

interface GameCornerTabProps {
  onWinTokens: (amount: number) => void;
}

const GameCornerTab: React.FC<GameCornerTabProps> = ({ onWinTokens }) => {
  const [activeGame, setActiveGame] = useState<'wheel' | 'coin'>('wheel');
  const [tokens, setTokens] = useState<number>(0);
  
  // Wheel State
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastSpinTime, setLastSpinTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [wheelPrize, setWheelPrize] = useState<number | null>(null);

  // Coin State
  const [isFlipping, setIsFlipping] = useState(false);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [betSide, setBetSide] = useState<'heads' | 'tails'>('heads');
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [coinMessage, setCoinMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const t = await db.getTokens();
      const st = await db.getLastSpinTime();
      setTokens(t);
      setLastSpinTime(st);
    };
    init();
  }, []);

  useEffect(() => {
    if (lastSpinTime === 0) return;
    const interval = setInterval(() => {
      const remaining = SPIN_COOLDOWN - (Date.now() - lastSpinTime);
      setTimeRemaining(remaining <= 0 ? 0 : remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSpinTime]);

  const handleWheelSpin = () => {
    if (isSpinning || timeRemaining > 0) return;
    setIsSpinning(true);
    setWheelPrize(null);
    const sectionCount = WHEEL_SECTIONS.length;
    const sectionAngle = 360 / sectionCount;
    const winningIndex = Math.floor(Math.random() * sectionCount);
    const baseRotations = 360 * 8;
    const targetSectionAngle = winningIndex * sectionAngle;
    const finalAngle = baseRotations + (360 - (targetSectionAngle + sectionAngle / 2));
    const totalRotation = rotation + finalAngle;
    setRotation(totalRotation);

    setTimeout(() => {
      const prize = WHEEL_SECTIONS[winningIndex].value;
      setWheelPrize(prize);
      onWinTokens(prize);
      setTokens(prev => prev + prize);
      const now = Date.now();
      db.setLastSpinTime(now);
      setLastSpinTime(now);
      setIsSpinning(false);
    }, 5000);
  };

  const handleCoinFlip = () => {
    if (isFlipping || tokens < betAmount || betAmount <= 0) return;
    setIsFlipping(true);
    setCoinResult(null);
    setCoinMessage(null);
    
    // Deduct bet immediately
    onWinTokens(-betAmount);
    setTokens(prev => prev - betAmount);

    setTimeout(() => {
      const result = Math.random() > 0.5 ? 'heads' : 'tails';
      setCoinResult(result);
      if (result === betSide) {
        const win = betAmount * 2;
        onWinTokens(win);
        setTokens(prev => prev + win);
        setCoinMessage(`SUCCESS! Gained ${win} tokens.`);
      } else {
        setCoinMessage(`FAILED! Predictions misaligned.`);
      }
      setIsFlipping(false);
    }, 2000);
  };

  const renderWheel = () => {
    const size = 320, center = size / 2, radius = size / 2 - 10;
    const sectionAngle = 360 / WHEEL_SECTIONS.length;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${center}px ${center}px`, transition: 'transform 5s cubic-bezier(0.15, 0, 0.15, 1)' }}>
          {WHEEL_SECTIONS.map((section, i) => {
            const startAngle = i * sectionAngle, endAngle = (i + 1) * sectionAngle;
            const x1 = center + radius * Math.cos((startAngle - 90) * Math.PI / 180);
            const y1 = center + radius * Math.sin((startAngle - 90) * Math.PI / 180);
            const x2 = center + radius * Math.cos((endAngle - 90) * Math.PI / 180);
            const y2 = center + radius * Math.sin((endAngle - 90) * Math.PI / 180);
            return (
              <g key={i}>
                <path d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`} fill={section.color} stroke="#0f172a" strokeWidth="2" />
                <text x={center} y={center - radius + 40} fill="white" fontWeight="900" fontSize="20" textAnchor="middle" style={{ transform: `rotate(${startAngle + sectionAngle / 2}deg)`, transformOrigin: `${center}px ${center}px` }}>{section.value}</text>
              </g>
            );
          })}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#334155" strokeWidth="8" />
          <circle cx={center} cy={center} r="15" fill="#1e293b" stroke="#f59e0b" strokeWidth="3" />
        </g>
      </svg>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Game Selector */}
      <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700">
        <button 
          onClick={() => setActiveGame('wheel')}
          className={`flex-1 py-3 rounded-xl font-black italic tracking-tighter transition-all ${activeGame === 'wheel' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          TOKEN WHEEL
        </button>
        <button 
          onClick={() => setActiveGame('coin')}
          className={`flex-1 py-3 rounded-xl font-black italic tracking-tighter transition-all ${activeGame === 'coin' ? 'bg-cyan-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          BINARY FLIP
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Main Game Stage */}
        <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden backdrop-blur-md flex flex-col items-center min-h-[500px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-pulse" />
          
          {activeGame === 'wheel' ? (
            <div className="flex flex-col items-center">
              <div className="relative mb-8">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"><div className="w-6 h-8 bg-amber-500 rounded-b-full shadow-lg border-2 border-slate-900 animate-bounce" /></div>
                <div className={`transition-all duration-500 ${isSpinning ? 'scale-110 blur-[0.5px]' : 'scale-100'}`}>{renderWheel()}</div>
              </div>
              <Button 
                onClick={handleWheelSpin} 
                disabled={isSpinning || timeRemaining > 0}
                className={`w-full py-4 text-xl font-black italic ${timeRemaining > 0 ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_0_20px_rgba(245,158,11,0.3)]'}`}
              >
                {isSpinning ? <LoaderIcon className="animate-spin" /> : timeRemaining > 0 ? `RECHARGING (${Math.ceil(timeRemaining / 1000)}s)` : 'SPIN WHEEL'}
              </Button>
              {wheelPrize && <div className="mt-4 text-amber-400 font-black animate-bounce">WIN: +{wheelPrize} TOKENS</div>}
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <div className="h-48 flex items-center justify-center mb-12">
                <div className={`relative w-32 h-32 transition-all duration-500 ${isFlipping ? 'animate-[spin_0.2s_linear_infinite] scale-125' : 'scale-100'}`}>
                  <div className={`absolute inset-0 rounded-full border-4 flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(6,182,212,0.4)] ${(!isFlipping && coinResult === 'heads') || (isFlipping) ? 'bg-cyan-500 border-cyan-400 text-slate-900' : 'bg-purple-600 border-purple-400 text-white'}`}>
                    {(!isFlipping && coinResult === 'tails') ? 'T' : <PokeballIcon className="w-16 h-16" />}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <button onClick={() => setBetSide('heads')} className={`py-4 rounded-2xl border-2 font-black transition-all ${betSide === 'heads' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>HEADS</button>
                <button onClick={() => setBetSide('tails')} className={`py-4 rounded-2xl border-2 font-black transition-all ${betSide === 'tails' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>TAILS</button>
              </div>

              <div className="w-full space-y-4">
                <div className="flex gap-2">
                  <input type="number" value={betAmount} onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))} className="flex-1 bg-black/40 border border-slate-700 rounded-xl px-4 py-3 font-mono text-cyan-400 outline-none focus:border-cyan-500 transition-all" />
                  <Button variant="secondary" onClick={() => setBetAmount(Math.floor(tokens / 2))} className="px-3 text-xs">HALF</Button>
                  <Button variant="secondary" onClick={() => setBetAmount(tokens)} className="px-3 text-xs">MAX</Button>
                </div>
                <Button 
                  onClick={handleCoinFlip} 
                  disabled={isFlipping || tokens < betAmount || betAmount <= 0}
                  className="w-full py-4 text-xl font-black italic bg-gradient-to-r from-cyan-600 to-blue-700 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                >
                  {isFlipping ? 'PREDICTING...' : `PREDICT (${betAmount} TOKENS)`}
                </Button>
                {coinMessage && <div className={`text-center font-bold animate-pulse text-sm mt-2 ${coinResult === betSide ? 'text-green-400' : 'text-red-400'}`}>{coinMessage}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Side Info / Rules */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
            <h3 className="text-xl font-black italic text-poke-yellow mb-4 flex items-center gap-2">
              <CoinsIcon className="w-5 h-5" /> CURRENT BANKROLL
            </h3>
            <div className="text-4xl font-mono text-white tracking-tighter">{tokens} TOKENS</div>
          </div>
          
          <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-4">Casino Guidelines</h4>
            <ul className="space-y-3 text-sm text-slate-400 font-mono">
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>The Token Wheel recharges every 60 seconds. Guaranteed wins up to 100 tokens.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500">•</span>
                <span>Binary Flip is high-risk. Correct predictions yield 2.0x return.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                <span>Misaligned predictions result in total loss of wagered tokens.</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center opacity-20">
            <SparklesIcon className="w-6 h-6" />
            <SparklesIcon className="w-6 h-6" />
            <SparklesIcon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCornerTab;
