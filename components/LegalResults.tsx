import React from 'react';
import { SearchResult } from '../types';

interface LegalResultsProps {
  results: SearchResult[];
  aiResponse: string | null;
  loading: boolean;
}

export const LegalResults: React.FC<LegalResultsProps> = ({ results, aiResponse, loading }) => {
  if (loading) {
    return (
      <div className="mt-8 space-y-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        <div className="h-32 bg-slate-200 rounded w-full"></div>
      </div>
    );
  }

  if (!results.length && !aiResponse) return null;

  return (
    <div className="mt-8 space-y-8">
      {/* AI Analysis */}
      {aiResponse && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
          <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Legal Analysis
          </h2>
          <div className="prose prose-sm max-w-none text-slate-800">
             <div dangerouslySetInnerHTML={{ __html: aiResponse.replace(/\n/g, '<br />') }} />
          </div>
        </div>
      )}

      {/* Relevant Sources */}
      <div className="space-y-4">
        <h3 className="text-md font-semibold text-slate-500 uppercase tracking-wider text-xs">Verified Source Text (Top Matches)</h3>
        {results.map((result, idx) => (
          <div key={result.chunk.id} className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
             <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-800 text-sm">{result.chunk.title}</h4>
                <span className="text-xs font-mono text-green-600 bg-green-50 px-2 py-1 rounded">
                  Match: {(result.similarity * 100).toFixed(1)}%
                </span>
             </div>
             <p className="text-slate-600 text-sm whitespace-pre-wrap font-serif leading-relaxed bg-slate-50 p-3 rounded">
                {result.chunk.content}
             </p>
          </div>
        ))}
      </div>
    </div>
  );
};
