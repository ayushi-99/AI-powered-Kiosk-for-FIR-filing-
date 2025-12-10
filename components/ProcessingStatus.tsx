import React from 'react';

interface ProcessingStatusProps {
  total: number;
  current: number;
  status: string;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ total, current, status }) => {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="w-full max-w-xl mx-auto mt-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-700">{status}</span>
        <span className="text-sm text-slate-500">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">
        Processing chunk {current} of {total}
      </p>
    </div>
  );
};
