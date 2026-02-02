
import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import * as db from '../services/indexedDbService';
// Added missing LoaderIcon to the imports from './icons'
import { SparklesIcon, CoinsIcon, LoaderIcon } from './icons';

const WHEEL_SECTIONS = [
  { value: 5, color: '#10b981' }, // emerald-500
  { value: 20, color: '#f59e0b' }, // amber-500
  { value: 10, color: '#3b82f6' }, // blue-500
  { value: 100, color: '#8b5cf6' }, // violet-500
  { value: 5, color: '#059669' }, // emerald-600
  { value: 50, color: '#f97316' }, // orange-500
  { value: 10, color: '#2563eb' }, // blue-600
  { value: 20, color: '#d97706' }, // amber-600
];

const SPIN_COOLDOWN = 60 * 1000; // 60 seconds

interface GameCornerTabProps {
  onWinTokens: (amount: number) => void;
}

const GameCornerTab: React.FC<GameCornerTabProps> = ({ onWinTokens }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastSpinTime, setLastSpinTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showWinModal, setShowWinModal] = useState<number | null>(null);

  useEffect(() => {
    const loadSpinTime = async () => {
      const time = await db.getLastSpinTime();
      setLastSpinTime(time);
    };
    loadSpinTime();
  }, []);

  useEffect(() => {
    if (lastSpinTime === 0) return;
    
    const updateRemainingTime = () => {
        const now = Date.now();
        const timePassed = now - lastSpinTime;
        const remaining = SPIN_COOLDOWN - timePassed;
        setTimeRemaining(remaining <= 0 ? 0 : remaining);
    };
    
    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);
    return () => clearInterval(interval);
  }, [lastSpinTime]);

  const handleSpin = () => {
    if (isSpinning || timeRemaining > 0) return;
    
    setIsSpinning(true);
    setShowWinModal(null);

    const sectionCount = WHEEL_SECTIONS.length;
    const sectionAngle = 360 / sectionCount;
    
    // Choose a random winning index
    const winningIndex = Math.floor(Math.random() * sectionCount);
    
    // Calculate total rotation
    // We want to land at the center of the section
    // The pointer is at the top (270 degrees in SVG coordinate space if we don't offset)
    // Actually, let's keep it simple: 
    // 1. Minimum 5 full rotations (1800 deg)
    // 2. Add the angle to get to the specific section
    // We need to account for the pointer being at 0 degrees (top)
    const baseRotations = 360 * 8; // 8 full spins
    const targetSectionAngle = winningIndex * sectionAngle;
    
    // The offset to align the pointer (top) with the selected slice
    // Pointer is at 0 degrees. Slice 0 starts at 0.
    // To get Slice N at 0, we need to rotate by -(N * sectionAngle + sectionAngle/2)
    const finalAngle = baseRotations + (360 - (targetSectionAngle + sectionAngle / 2));
    
    const totalRotation = rotation + finalAngle;
    setRotation(totalRotation);

    setTimeout(() => {
      const prize = WHEEL_SECTIONS[winningIndex].value;
      setShowWinModal(prize);
      onWinTokens(prize);
      const now = Date.now();
      db.setLastSpinTime(now);
      setLastSpinTime(now);
      setIsSpinning(false);
    }, 5000);
  };

  const renderWheel = () => {
    const size = 320;
    const center = size / 2;
    const radius = size / 2 - 10;
    const sectionAngle = 360 / WHEEL_SECTIONS.length;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${center}px ${center}px`, transition: 'transform 5s cubic-bezier(0.15, 0, 0.15, 1)' }}>
          {WHEEL_SECTIONS.map((section, i) => {
            const startAngle = i * sectionAngle;
            const endAngle = (i + 1) * sectionAngle;
            
            // Convert to radians for SVG path
            const x1 = center + radius * Math.cos((startAngle - 90) * Math.PI / 180);
            const y1 = center + radius * Math.sin((startAngle - 90) * Math.PI / 180);
            const x2 = center + radius * Math.cos((endAngle - 90) * Math.PI / 180);
            const y2 = center + radius * Math.sin((endAngle - 90) * Math.PI / 180);

            const largeArcFlag = sectionAngle > 180 ? 1 : 0;
            const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            return (
              <g key={i}>
                <path d={pathData} fill={section.color} stroke="#0f172a" strokeWidth="2" />
                <text
                  x={center}
                  y={center - radius + 40}
                  fill="white"
                  fontWeight="900"
                  fontSize="20"
                  textAnchor="middle"
                  style={{ transform: `rotate(${startAngle + sectionAngle / 2}deg)`, transformOrigin: `${center}px ${center}px` }}
                >
                  {section.value}
                </text>
              </g>
            );
          })}
          {/* Outer Ring */}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#334155" strokeWidth="8" />
          {/* Inner Peg */}
          <circle cx={center} cy={center} r={15} fill="#1e293b" stroke="#f59e0b" strokeWidth="3" />
        </g>
      </svg>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-3xl border border-slate-700/50 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent animate-pulse" />
      
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-poke-yellow to-amber-500 italic tracking-tighter mb-2">
          GAME CORNER WHEEL
        </h2>
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">High Stakes • Instant Rewards</p>
      </div>
      
      <div className="relative mb-12">
        {/* Pointer */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
            <div className="w-6 h-8 bg-poke-yellow rounded-b-full shadow-lg border-2 border-slate-900 animate-bounce" />
            <div className="w-1 h-2 bg-poke-yellow/50" />
        </div>

        {/* The Wheel */}
        <div className={`relative transition-all duration-500 ${isSpinning ? 'scale-110 blur-[0.5px]' : 'scale-100'}`}>
          {renderWheel()}
        </div>

        {/* Glowing aura when spinning */}
        {isSpinning && (
          <div className="absolute inset-0 rounded-full bg-yellow-500/10 animate-pulse -z-10 blur-3xl" />
        )}
      </div>
      
      <div className="w-full max-w-sm space-y-4">
        <Button 
          onClick={handleSpin} 
          disabled={isSpinning || timeRemaining > 0}
          className={`w-full py-4 text-xl font-black italic tracking-widest transition-all duration-300 transform active:scale-95 ${timeRemaining > 0 ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]'}`}
        >
          {isSpinning ? (
            <div className="flex items-center gap-2">
              <LoaderIcon className="animate-spin" /> SPINNING...
            </div>
          ) : timeRemaining > 0 ? (
            `RECHARGING (${Math.ceil(timeRemaining / 1000)}s)`
          ) : (
            'SPIN NOW!'
          )}
        </Button>

        {showWinModal !== null && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-2xl p-4 flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg text-white">
                <CoinsIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase font-black text-green-400">Jackpot!</p>
                <p className="text-xl font-black text-white">+{showWinModal} TOKENS</p>
              </div>
            </div>
            <SparklesIcon className="w-8 h-8 text-yellow-400 animate-pulse" />
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-6 opacity-30">
         {[...Array(4)].map((_, i) => <SparklesIcon key={i} className="w-4 h-4 text-slate-500" />)}
      </div>
    </div>
  );
};

export default GameCornerTab;
