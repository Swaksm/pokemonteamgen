import React, { useState, useEffect } from 'react';
import Button from './Button';
import * as db from '../services/indexedDbService';
import { SparklesIcon } from './icons';

const WHEEL_SECTIONS = [
  { value: 5, color: 'bg-green-500' },
  { value: 20, color: 'bg-yellow-500' },
  { value: 10, color: 'bg-blue-500' },
  { value: 100, color: 'bg-purple-600' },
  { value: 5, color: 'bg-green-500' },
  { value: 50, color: 'bg-orange-500' },
  { value: 10, color: 'bg-blue-500' },
  { value: 20, color: 'bg-yellow-500' },
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
        if (remaining <= 0) {
            setTimeRemaining(0);
        } else {
            setTimeRemaining(remaining);
        }
    };
    
    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [lastSpinTime]);

  const handleSpin = () => {
    if (isSpinning || timeRemaining > 0) return;
    
    setIsSpinning(true);
    const spinCycles = Math.floor(Math.random() * 3) + 5;
    const randomIndex = Math.floor(Math.random() * WHEEL_SECTIONS.length);
    const sectionAngle = 360 / WHEEL_SECTIONS.length;
    const targetAngleWithinSection = Math.random() * (sectionAngle - 10) + 5; // Avoid landing exactly on lines
    const targetAngle = (sectionAngle * randomIndex) + targetAngleWithinSection;
    
    const currentRotation = rotation % 360;
    const finalRotation = (spinCycles * 360) + targetAngle - currentRotation;

    setRotation(rotation + finalRotation);

    setTimeout(() => {
      const prize = WHEEL_SECTIONS[randomIndex].value;
      alert(`You won ${prize} tokens!`);
      onWinTokens(prize);
      const now = Date.now();
      db.setLastSpinTime(now);
      setLastSpinTime(now);
      setIsSpinning(false);
    }, 5000); // Corresponds to the transition duration
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-800/50 rounded-lg border border-slate-700">
      <h2 className="text-3xl font-bold text-poke-yellow mb-4">Token Wheel</h2>
      <p className="text-slate-400 mb-8">Spin the wheel every minute for a chance to win free tokens!</p>
      
      <div className="relative w-80 h-80 mb-8">
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
          <div className="w-0 h-0 border-x-8 border-x-transparent border-t-[16px] border-t-poke-yellow"></div>
        </div>

        <div 
          className="relative w-full h-full rounded-full border-4 border-slate-600 overflow-hidden transition-transform duration-[5000ms] ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {WHEEL_SECTIONS.map((section, index) => {
            const angle = 360 / WHEEL_SECTIONS.length;
            return (
              <div 
                key={index}
                className="absolute w-1/2 h-1/2 origin-bottom-right"
                style={{ transform: `rotate(${index * angle}deg)`}}
              >
                {/* FIX: The style attribute had multiple 'clipPath' properties, causing an error. 
                    This has been corrected to use a single, accurate SVG path for the clip-path.
                    The nested div structure was also simplified to improve readability and remove conflicting styles. */}
                <div 
                  className={`absolute w-full h-full ${section.color}`}
                  style={{ 
                    transformOrigin: '0 0',
                    transform: 'rotate(22.5deg) scale(1.02)', 
                    clipPath: `path('M 0 0 L 160 0 A 160 160 0 0 1 113.13 113.13 L 0 0')` 
                  }}
                >
                  <span 
                    className="text-white font-bold text-xl absolute" 
                    style={{ transform: `rotate(${angle / 2}deg) translate(50px, 15px)` }}
                  >
                    {section.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <Button 
        onClick={handleSpin} 
        disabled={isSpinning || timeRemaining > 0}
        className="w-full max-w-xs text-xl py-3"
      >
        {isSpinning ? 'Spinning...' : timeRemaining > 0 ? `Next spin in ${Math.ceil(timeRemaining / 1000)}s` : 'Spin the Wheel!'}
      </Button>
    </div>
  );
};

export default GameCornerTab;