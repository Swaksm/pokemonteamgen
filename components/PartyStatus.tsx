import React from 'react';
import type { Pokemon } from '../types';
import { PokeballIcon } from './icons';

type BattlePokemon = Pokemon & { currentHp: number };

interface PartyStatusProps {
  party: BattlePokemon[];
  isOpponent?: boolean;
}

const PartyStatus: React.FC<PartyStatusProps> = ({ party, isOpponent = false }) => {
  const placeholders = Array(6 - party.length).fill(null);

  return (
    <div className={`flex gap-2 ${isOpponent ? 'justify-end' : 'justify-start'}`}>
      {[...party, ...placeholders].map((p, i) => {
        const isFainted = p === null || p.currentHp <= 0;
        return (
          <div key={i} title={p ? `${p.name} (${p.currentHp > 0 ? 'Active' : 'Fainted'})` : 'Empty'}>
            <PokeballIcon className={`w-6 h-6 transition-colors ${isFainted ? 'text-slate-600' : 'text-white'}`} />
          </div>
        );
      })}
    </div>
  );
};

export default PartyStatus;
