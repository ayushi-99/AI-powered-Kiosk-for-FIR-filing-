import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ProcessingStatus } from './components/ProcessingStatus';
import { LegalResults } from './components/LegalResults';
import { parseAndChunkText } from './utils/textProcessor';
import { vectorStore } from './services/vectorStore';
import { generateEmbedding, generateRAGResponse } from './services/geminiService';
import { DocumentChunk, SearchResult, AppState } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file upload and start processing
  const handleFileLoaded = useCallback(async (text: string, fileName: string) => {
    try {
      setAppState(AppState.PROCESSING_FILE);
      setError(null);
      
      // 1. Chunking
      console.log('Chunking text...');
      const parsedChunks = parseAndChunkText(text);
      if (parsedChunks.length === 0) {
        throw new Error("No sections found. Please check the file format.");
      }
      setChunks(parsedChunks);
      
      // 2. Indexing (Embedding)
      setAppState(AppState.INDEXING);
      setProcessedCount(0);
      vectorStore.clear();

      console.log(`Starting indexing for ${parsedChunks.length} chunks...`);

      // Process in concurrent batches to speed up indexing while respecting rate limits
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
        
        // Minimal delay to allow UI updates and prevent total freeze
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setAppState(AppState.READY);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process file. Please try again.");
      setAppState(AppState.IDLE);
    }
  }, []);

  // Handle Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || appState !== AppState.READY) return;

    setAppState(AppState.SEARCHING);
    setResults([]);
    setAiResponse(null);
    setError(null);

    try {
      // 1. Embed Query
      const queryVector = await generateEmbedding(query);

      // 2. Vector Search
      const searchResults = vectorStore.search(queryVector, 4); // Get top 4 matches
      setResults(searchResults);

      // 3. Generate Answer using Context
      const matchedChunks = searchResults.map(r => r.chunk);
      const answer = await generateRAGResponse(query, matchedChunks);
      setAiResponse(answer);

      setAppState(AppState.READY);
    } catch (err) {
      console.error("Search failed", err);
      setError("Failed to analyze query. Please check your connection.");
      setAppState(AppState.READY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 text-white p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
             </div>
             <div>
                 <h1 className="text-xl font-bold text-slate-900 leading-none">BNS Legal Assistant</h1>
                 <p className="text-xs text-slate-500 mt-1">Bharatiya Nyaya Sanhita RAG System</p>
             </div>
          </div>
          <div className="text-xs font-mono text-slate-400">
             {vectorStore.size > 0 ? `${vectorStore.size} Sections Indexed` : 'Not Indexed'}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        
        {/* Error Message */}
        {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm border border-red-200">
                {error}
            </div>
        )}

        {/* Step 1: Upload */}
        {appState === AppState.IDLE && (
            <div className="animate-fade-in-up">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-2">Load Legal Document</h2>
                    <p className="text-slate-600">Upload the BNS text file to create a local vector knowledge base.</p>
                </div>
                <FileUpload onFileLoaded={handleFileLoaded} />
                
                <div className="mt-8 text-center text-xs text-slate-400 max-w-md mx-auto">
                    Tip: Use a clean .txt file where sections start with "Section X" or "X." (e.g., "302. Murder").
                </div>
            </div>
        )}

        {/* Step 2: Processing */}
        {(appState === AppState.PROCESSING_FILE || appState === AppState.INDEXING) && (
            <div className="animate-fade-in">
                <h2 className="text-center text-xl font-semibold text-slate-800 mb-4">Building Knowledge Base</h2>
                <ProcessingStatus 
                    total={chunks.length} 
                    current={processedCount} 
                    status={appState === AppState.PROCESSING_FILE ? "Analysing text structure..." : "Generating embeddings & Indexing..."} 
                />
            </div>
        )}

        {/* Step 3: Search Interface */}
        {(appState === AppState.READY || appState === AppState.SEARCHING) && (
            <div className="animate-fade-in space-y-6">
                
                {/* Search Box */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <form onSubmit={handleSearch}>
                        <label htmlFor="crime-input" className="block text-sm font-medium text-slate-700 mb-2">
                            Describe the Crime / Incident
                        </label>
                        <div className="relative">
                            <textarea
                                id="crime-input"
                                rows={3}
                                className="block w-full rounded-lg border-slate-300 border focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 shadow-sm resize-none"
                                placeholder="e.g. Someone stole my wallet while I was travelling on the bus..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                disabled={appState === AppState.SEARCHING}
                            />
                            <button
                                type="submit"
                                disabled={!query.trim() || appState === AppState.SEARCHING}
                                className={`absolute bottom-3 right-3 px-4 py-2 rounded-md text-sm font-medium text-white transition-all
                                    ${!query.trim() || appState === AppState.SEARCHING 
                                        ? 'bg-slate-300 cursor-not-allowed' 
                                        : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
                            >
                                {appState === AppState.SEARCHING ? 'Analyzing...' : 'Find Legal Sections'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Results Area */}
                <LegalResults 
                    results={results} 
                    aiResponse={aiResponse} 
                    loading={appState === AppState.SEARCHING} 
                />
                
                <div className="text-center pt-8">
                     <button 
                        onClick={() => {
                            setAppState(AppState.IDLE);
                            vectorStore.clear();
                            setChunks([]);
                            setQuery('');
                            setResults([]);
                            setAiResponse(null);
                        }}
                        className="text-sm text-slate-400 hover:text-red-500 underline"
                    >
                        Reset and upload new file
                    </button>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;