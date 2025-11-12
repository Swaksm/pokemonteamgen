
import React from 'react';
import { CoinsIcon } from './icons';

interface HeaderProps {
  tokens: number;
}

const Header: React.FC<HeaderProps> = ({ tokens }) => {
  return (
    <header className="bg-slate-800/80 backdrop-blur-lg sticky top-0 z-40 border-b border-slate-700">
      <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Pokémon <span className="text-poke-yellow">Team Builder</span>
        </h1>
        <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-full text-lg font-semibold text-poke-yellow">
          <CoinsIcon className="w-6 h-6" />
          <span>{tokens}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
