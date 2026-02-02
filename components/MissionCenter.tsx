
import React from 'react';
import type { Mission } from '../types';
import Button from './Button';
import { CoinsIcon, PokeballIcon, SwordsIcon, SparklesIcon } from './icons';
import TypeBadge from './TypeBadge';

interface MissionCenterProps {
  missions: Mission[];
  onClaim: (mission: Mission) => void;
}

const MissionCenter: React.FC<MissionCenterProps> = ({ missions, onClaim }) => {
  if (missions.length === 0) return null;

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-6 mb-8 backdrop-blur-md">
      <div className="flex items-center gap-3 mb-6">
        <SparklesIcon className="w-6 h-6 text-poke-yellow" />
        <h2 className="text-xl font-bold uppercase tracking-tighter italic">Daily Objectives</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {missions.map(mission => {
          const progress = (mission.current / mission.target) * 100;
          const isReady = mission.completed && !mission.claimed;

          return (
            <div key={mission.id} className={`p-4 rounded-2xl border transition-all ${mission.claimed ? 'bg-slate-900/50 border-slate-800 opacity-50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-slate-900 rounded-lg">
                  {mission.type === 'collect' || mission.type === 'type-collect' ? <PokeballIcon className="w-5 h-5 text-poke-yellow" /> : 
                   mission.type === 'battle' ? <SwordsIcon className="w-5 h-5 text-poke-red" /> : 
                   <CoinsIcon className="w-5 h-5 text-green-400" />}
                </div>
                <div className="flex items-center gap-1 text-poke-yellow font-bold text-sm">
                  <CoinsIcon className="w-4 h-4" />
                  {mission.reward}
                </div>
              </div>

              <p className="text-sm font-medium text-slate-200 mb-3 min-h-[40px]">
                {mission.description}
                {mission.targetType && <span className="ml-1"><TypeBadge type={mission.targetType} small /></span>}
              </p>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase">
                  <span>Progress</span>
                  <span>{mission.current} / {mission.target}</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${mission.completed ? 'bg-green-500' : 'bg-poke-blue'}`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>

              {isReady && (
                <Button 
                  onClick={() => onClaim(mission)} 
                  className="w-full mt-4 py-1 text-xs bg-green-600 hover:bg-green-500 border-none shadow-lg shadow-green-900/20"
                >
                  CLAIM REWARD
                </Button>
              )}
              {mission.claimed && (
                <div className="mt-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Completed
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MissionCenter;
