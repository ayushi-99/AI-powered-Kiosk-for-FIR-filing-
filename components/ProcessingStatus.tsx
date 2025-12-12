import React from 'react';

interface ProcessingStatusProps {
  total: number;
  current: number;
  status: string;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ total, current, status }) => {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="w-full mt-6">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-bold text-white/40 uppercase tracking-wider">{status}</span>
        <span className="text-sm font-medium text-white/80">{percentage}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
        <div 
          className="bg-white h-1 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};