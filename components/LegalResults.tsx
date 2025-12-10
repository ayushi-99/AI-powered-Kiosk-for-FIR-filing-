import React from 'react';
import { SearchResult, LegalAnalysisResult } from '../types';

interface LegalResultsProps {
  results: SearchResult[];
  analysis: LegalAnalysisResult | null;
  loading: boolean;
}

export const LegalResults: React.FC<LegalResultsProps> = ({ results, analysis, loading }) => {
  if (loading) {
    return (
      <div className="mt-8 space-y-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        <div className="h-32 bg-slate-200 rounded w-full"></div>
      </div>
    );
  }

  if (!results.length && !analysis) return null;

  const getVerdictColor = (classification: string) => {
    if (classification === 'Cognizable Offense') return 'bg-green-100 text-green-800 border-green-200';
    if (classification === 'Non-Cognizable/Civil Dispute') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  return (
    <div className="mt-8 space-y-8">
      {/* Structured Verdict Card */}
      {analysis && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
               <div>
                  <h2 className="text-xl font-bold text-slate-800">Legal Analysis Verdict</h2>
                  <p className="text-slate-500 text-sm">Based on BNS Ingredients (Mens Rea + Actus Reus)</p>
               </div>
               <div className={`px-4 py-2 rounded-full border font-bold text-sm ${getVerdictColor(analysis.classification)}`}>
                  {analysis.classification}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Applicable BNS Section</h3>
                    <p className="text-2xl font-mono font-bold text-indigo-600">{analysis.bns_section}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Confidence Score</h3>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-200 rounded-full h-2.5">
                            <div 
                                className={`h-2.5 rounded-full ${analysis.confidence_score > 70 ? 'bg-green-500' : analysis.confidence_score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                style={{ width: `${analysis.confidence_score}%` }}
                            ></div>
                        </div>
                        <span className="font-bold text-slate-700">{analysis.confidence_score}%</span>
                    </div>
                </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50/50 space-y-6">
             <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Reasoning
                </h3>
                <p className="text-slate-700 leading-relaxed text-sm">
                    {analysis.reasoning}
                </p>
             </div>
             
             {analysis.missing_details !== 'N/A' && (
                 <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Missing Details
                    </h3>
                    <p className="text-slate-700 leading-relaxed text-sm bg-orange-50 border border-orange-100 p-3 rounded-lg">
                        {analysis.missing_details}
                    </p>
                 </div>
             )}
          </div>
        </div>
      )}

      {/* Relevant Sources */}
      <div className="space-y-4">
        <h3 className="text-md font-semibold text-slate-500 uppercase tracking-wider text-xs">Reference Text (BNS Context)</h3>
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