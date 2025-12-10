import React, { useState, useEffect } from 'react';
import { ProcessingStatus } from './components/ProcessingStatus';
import { LegalResults } from './components/LegalResults';
import { parseAndChunkText } from './utils/textProcessor';
import { vectorStore } from './services/vectorStore';
import { generateEmbedding, analyzeComplaint } from './services/geminiService';
import { DocumentChunk, SearchResult, AppState, LegalAnalysisResult } from './types';
import { BNS_TEXT } from './services/bnsContent';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [analysis, setAnalysis] = useState<LegalAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Automatically load and process the BNS text on mount
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        setAppState(AppState.PROCESSING_FILE);
        
        // 1. Chunking
        console.log('Chunking BNS text...');
        const parsedChunks = parseAndChunkText(BNS_TEXT);
        setChunks(parsedChunks);
        
        // 2. Indexing (Embedding)
        setAppState(AppState.INDEXING);
        setProcessedCount(0);
        vectorStore.clear();

        console.log(`Starting indexing for ${parsedChunks.length} chunks...`);

        // Process in concurrent batches
        const BATCH_SIZE = 5; 
        
        for (let i = 0; i < parsedChunks.length; i += BATCH_SIZE) {
          const batch = parsedChunks.slice(i, i + BATCH_SIZE);
          
          await Promise.all(batch.map(async (chunk) => {
              try {
                  const vector = await generateEmbedding(chunk.content);
                  vectorStore.add(chunk, vector);
              } catch (e) {
                  console.error(`Failed to embed chunk ${chunk.id}`, e);
              }
          }));

          setProcessedCount(prev => Math.min(prev + BATCH_SIZE, parsedChunks.length));
          
          // Minimal delay to allow UI updates
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        setAppState(AppState.READY);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to initialize system.");
        setAppState(AppState.IDLE);
      }
    };

    initializeSystem();
  }, []);

  // Handle Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || appState !== AppState.READY) return;

    setAppState(AppState.SEARCHING);
    setResults([]);
    setAnalysis(null);
    setError(null);

    try {
      // 1. Embed Query
      const queryVector = await generateEmbedding(query);

      // 2. Vector Search
      const searchResults = vectorStore.search(queryVector, 5); // Get top 5 matches
      setResults(searchResults);

      // 3. Generate Analysis using Context
      const matchedChunks = searchResults.map(r => r.chunk);
      const analysisResult = await analyzeComplaint(query, matchedChunks);
      setAnalysis(analysisResult);

      setAppState(AppState.READY);
    } catch (err) {
      console.error("Search failed", err);
      setError("Failed to analyze complaint. Please try again.");
      setAppState(AppState.READY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-700 text-white p-2 rounded-lg shadow-md">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
             </div>
             <div>
                 <h1 className="text-xl font-bold text-slate-900 leading-tight">Bharatiya Nyaya Sanhita (BNS) AI</h1>
                 <p className="text-xs text-slate-500 font-medium">Legal Complaint Assistant</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${appState === AppState.READY || appState === AppState.SEARCHING ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
               {appState === AppState.READY || appState === AppState.SEARCHING ? 'System Active' : 'Initializing...'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        
        {/* Error Message */}
        {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-8 text-sm border border-red-200 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
            </div>
        )}

        {/* Initialization Phase */}
        {(appState === AppState.PROCESSING_FILE || appState === AppState.INDEXING || appState === AppState.IDLE) && (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Preparing Legal Knowledge Base</h2>
                <p className="text-slate-500 mb-8 text-center max-w-md">We are indexing the Bharatiya Nyaya Sanhita (BNS) so you can search for legal sections relevant to your complaint.</p>
                <ProcessingStatus 
                    total={chunks.length || 100} 
                    current={processedCount} 
                    status={appState === AppState.INDEXING ? "Indexing Sections..." : "Analyzing Text..."} 
                />
            </div>
        )}

        {/* Main Interface */}
        {(appState === AppState.READY || appState === AppState.SEARCHING) && (
            <div className="animate-fade-in space-y-8">
                
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-extrabold text-slate-900 mb-3">File a Complaint</h2>
                  <p className="text-lg text-slate-600">Describe the incident in plain English. The AI will classify it and identify the relevant BNS sections.</p>
                </div>

                {/* Complaint Box */}
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                    <form onSubmit={handleSearch}>
                        <label htmlFor="crime-input" className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                            Incident Details
                        </label>
                        <textarea
                            id="crime-input"
                            rows={5}
                            className="block w-full rounded-xl border-slate-300 border bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-base p-4 shadow-inner resize-none transition-all"
                            placeholder="Example: My neighbor intentionally damaged my car parked outside my house last night..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            disabled={appState === AppState.SEARCHING}
                        />
                        <div className="mt-4 flex justify-end">
                          <button
                              type="submit"
                              disabled={!query.trim() || appState === AppState.SEARCHING}
                              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-base font-bold text-white transition-all transform active:scale-95
                                  ${!query.trim() || appState === AppState.SEARCHING 
                                      ? 'bg-slate-300 cursor-not-allowed' 
                                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30'}`}
                          >
                              {appState === AppState.SEARCHING ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Analysing...
                                </>
                              ) : (
                                <>
                                  Analyze Complaint
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                                </>
                              )}
                          </button>
                        </div>
                    </form>
                </div>

                {/* Results Area */}
                <LegalResults 
                    results={results} 
                    analysis={analysis} 
                    loading={appState === AppState.SEARCHING} 
                />
            </div>
        )}

      </main>
    </div>
  );
};

export default App;