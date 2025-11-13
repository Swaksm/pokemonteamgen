import React from 'react';

interface HealthBarProps {
  currentHp: number;
  maxHp: number;
  label?: string;
}

const HealthBar: React.FC<HealthBarProps> = ({ currentHp, maxHp, label }) => {
  const percentage = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
  const color = percentage > 50 ? 'bg-green-500' : percentage > 20 ? 'bg-yellow-500' : 'bg-red-600';

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        {label && <span className="font-bold text-sm">{label}</span>}
        <span className="text-sm font-mono text-slate-300">{Math.max(0, currentHp)} / {maxHp}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-4 border-2 border-slate-900 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default HealthBar;
