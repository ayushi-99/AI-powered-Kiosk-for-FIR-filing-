import React from 'react';
import { SearchResult, LegalAnalysisResult } from '../types';

interface LegalResultsProps {
  results: SearchResult[];
  analysis: LegalAnalysisResult | null;
  loading: boolean;
  onGenerateFIR?: () => void;
  isDrafting?: boolean;
}

export const LegalResults: React.FC<LegalResultsProps> = ({ results, analysis, loading, onGenerateFIR, isDrafting }) => {
  if (loading || !analysis) return null;

  // HUD Theme Logic - Ambient Glow
  const getHudTheme = (classification: string) => {
    switch (classification) {
      case 'Cognizable Offense':
        return {
          borderColor: 'border-[#34C759]', // Apple Green
          glow: 'shadow-[0_0_40px_rgba(52,199,89,0.15)]',
          textColor: 'text-[#34C759]',
          statusTitle: 'COGNIZABLE OFFENSE',
          actionLabel: 'Generate Draft FIR',
          canAction: true
        };
      case 'Non-Cognizable/Civil Dispute':
        return {
          borderColor: 'border-[#FF3B30]', // Apple Red
          glow: 'shadow-[0_0_40px_rgba(255,59,48,0.15)]',
          textColor: 'text-[#FF3B30]',
          statusTitle: 'CIVIL / NON-COGNIZABLE',
          actionLabel: 'Download Mediation Guide',
          canAction: false
        };
      default: // Ambiguous
        return {
          borderColor: 'border-[#FFCC00]', // Apple Yellow
          glow: 'shadow-[0_0_40px_rgba(255,204,0,0.15)]',
          textColor: 'text-[#FFCC00]',
          statusTitle: 'INFORMATION INCOMPLETE',
          actionLabel: 'Update Complaint',
          canAction: false
        };
    }
  };

  const theme = getHudTheme(analysis.classification);

  // Score
  const rawScore = analysis.confidence_score;
  const displayScore = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);

  const showTranslation = analysis.detected_language && 
                          analysis.translated_narrative && 
                          !analysis.detected_language.toLowerCase().includes('english') &&
                          analysis.detected_language.toLowerCase() !== 'en';
  
  const hasTranscription = analysis.transcription && analysis.transcription !== 'N/A';
  const hasVisualAnalysis = analysis.visual_analysis && analysis.visual_analysis !== 'N/A';

  return (
    <div className="w-full space-y-6">
      
      {/* MAIN HUD CARD */}
      <div className={`
         relative overflow-hidden
         bg-black/40 backdrop-blur-md
         rounded-2xl border ${theme.borderColor}
         ${theme.glow}
         p-8
         transition-all duration-500
      `}>
         {/* HUD HEADER */}
         <div className="flex justify-between items-start mb-8">
            <div>
               <h2 className={`text-sm font-semibold tracking-widest uppercase mb-1 opacity-80 ${theme.textColor}`}>Classification</h2>
               <h1 className={`text-2xl md:text-3xl font-bold tracking-tight text-white`}>{theme.statusTitle}</h1>
            </div>
            <div className="text-right">
               <div className="text-4xl font-light text-white">{displayScore}%</div>
               <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Confidence</div>
            </div>
         </div>

         {/* HUD BODY */}
         <div className="space-y-6">
            
            {/* Context Blocks (Transcription/Translation) */}
            {(hasTranscription || showTranslation || hasVisualAnalysis) && (
               <div className="grid grid-cols-1 gap-4 text-sm">
                  {hasTranscription && (
                     <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Transcription</div>
                        <div className="text-white/90 italic">"{analysis.transcription}"</div>
                     </div>
                  )}
                  {showTranslation && (
                     <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Translation ({analysis.detected_language})</div>
                        <div className="text-white/90 italic">"{analysis.translated_narrative}"</div>
                     </div>
                  )}
                  {hasVisualAnalysis && (
                     <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                        <div className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">Visual Analysis</div>
                        <div className="text-white/90">{analysis.visual_analysis}</div>
                     </div>
                  )}
               </div>
            )}

            {/* Key Data Points */}
            <div className="flex flex-col md:flex-row gap-8 py-6 border-t border-white/10 border-b">
               <div className="flex-1">
                  <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">BNS Section</div>
                  <div className="text-xl font-medium text-white">{analysis.bns_section}</div>
               </div>
               <div className="flex-1">
                  <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Missing Info</div>
                  <div className={`text-sm font-medium ${analysis.missing_details !== 'N/A' ? 'text-amber-400' : 'text-white/60'}`}>
                     {analysis.missing_details}
                  </div>
               </div>
            </div>

            {/* Reasoning */}
            <div>
               <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">AI Reasoning</div>
               <p className="text-white/80 leading-relaxed text-lg font-light">
                  {analysis.reasoning}
               </p>
            </div>
         </div>

         {/* HUD FOOTER ACTIONS */}
         <div className="mt-8 pt-6">
            {theme.canAction ? (
               <button 
                  onClick={onGenerateFIR}
                  disabled={isDrafting}
                  className="
                     w-full py-4 rounded-full
                     bg-white text-black font-semibold text-lg
                     hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50
                     shadow-lg transition-all flex justify-center items-center gap-2
                  "
               >
                  {isDrafting ? (
                     <>
                       <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                       Drafting...
                     </>
                  ) : theme.actionLabel}
               </button>
            ) : (
               <div className="w-full py-4 rounded-full bg-white/10 text-white/40 font-semibold text-center cursor-not-allowed border border-white/5">
                  Action Not Required
               </div>
            )}
         </div>
      </div>

      {/* Relevant Sources (Glass Accordion) */}
      <details className="group">
          <summary className="list-none flex items-center justify-center cursor-pointer text-white/40 hover:text-white transition-colors text-sm font-medium">
              <span>View Source Context</span>
              <svg className="w-4 h-4 ml-2 transform group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
          </summary>
          <div className="mt-6 space-y-4 animate-fade-in">
            {results.map((result) => (
              <div key={result.chunk.id} className="bg-white/5 p-5 rounded-xl border border-white/5">
                 <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white text-sm">{result.chunk.title}</h4>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20">
                      Match: {(result.similarity * 100).toFixed(0)}%
                    </span>
                 </div>
                 <p className="text-white/60 text-xs leading-relaxed font-mono">
                    {result.chunk.content.substring(0, 300)}...
                 </p>
              </div>
            ))}
          </div>
      </details>
    </div>
  );
};