import React from 'react';
import type { PokemonType } from '../types';
import { TYPE_COLORS } from '../constants';

interface TypeBadgeProps {
  type: PokemonType;
  small?: boolean;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type, small = false }) => {
  const colorClass = TYPE_COLORS[type] || 'bg-gray-500 text-white';
  const sizeClass = small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';
  return (
    <span className={`rounded-md font-bold uppercase tracking-wider ${sizeClass} ${colorClass}`}>
      {type}
    </span>
  );
};

export default TypeBadge;
