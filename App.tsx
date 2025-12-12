import React, { useState, useEffect, useRef } from 'react';
import { ProcessingStatus } from './components/ProcessingStatus';
import { LegalResults } from './components/LegalResults';
import { LandingPage } from './components/LandingPage';
import { FIRModal } from './components/FIRModal';
import { parseAndChunkText } from './utils/textProcessor';
import { vectorStore } from './services/vectorStore';
import { generateEmbedding, analyzeComplaint, generateFIRDraft } from './services/geminiService';
import { DocumentChunk, SearchResult, AppState, LegalAnalysisResult, TestResult } from './types';
import { BNS_TEXT } from './services/bnsContent';
import { redTeamScenarios } from './services/redTeamData';

type UIStep = 'LANDING' | 'BOOT' | 'WELCOME' | 'INPUT' | 'ANALYZING' | 'RESULT';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [uiStep, setUiStep] = useState<UIStep>('LANDING');
  
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [analysis, setAnalysis] = useState<LegalAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [showTranscriptionToast, setShowTranscriptionToast] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Image Input State
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draft FIR State
  const [isDrafting, setIsDrafting] = useState(false);
  const [firDraft, setFirDraft] = useState<string | null>(null);

  // Red Team State
  const [showRedTeam, setShowRedTeam] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runningTests, setRunningTests] = useState(false);

  // Automatically load and process the BNS text on mount
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        setAppState(AppState.PROCESSING_FILE);
        
        // 1. Chunking
        const parsedChunks = parseAndChunkText(BNS_TEXT);
        setChunks(parsedChunks);
        
        // 2. Indexing (Embedding)
        setAppState(AppState.INDEXING);
        setProcessedCount(0);
        vectorStore.clear();

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

  // Handle transition from BOOT to WELCOME when Ready
  useEffect(() => {
    if (appState === AppState.READY && uiStep === 'BOOT') {
        setUiStep('WELCOME');
    }
  }, [appState, uiStep]);

  const handleEnterApp = () => {
      if (appState === AppState.READY) {
          setUiStep('WELCOME');
      } else {
          setUiStep('BOOT');
      }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            setAudioBase64(base64Data);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleRecording = () => {
    isRecording ? stopRecording() : startRecording();
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioBase64(null);
    setQuery('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
          setError("Please upload a valid image file.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
          setEvidenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
  };

  const clearImage = () => {
      setEvidenceImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSearch = async () => {
    if ((!query.trim() && !audioBase64) || appState !== AppState.READY) return;

    setUiStep('ANALYZING');
    setAppState(AppState.SEARCHING);
    // Do NOT clear results immediately to prevent jumping, or handle gracefully
    // setResults([]); 
    // setAnalysis(null);
    setError(null);
    setShowTranscriptionToast(false);
    setFirDraft(null);

    try {
      const textToEmbed = query.trim() || "General criminal offense report";
      const queryVector = await generateEmbedding(textToEmbed);
      const searchResults = vectorStore.search(queryVector, 5);
      setResults(searchResults);

      const matchedChunks = searchResults.map(r => r.chunk);
      const imagePayload = evidenceImage ? evidenceImage.split(',')[1] : undefined;
      const analysisResult = await analyzeComplaint(query, matchedChunks, audioBase64 || undefined, imagePayload);
      
      setAnalysis(analysisResult);

      if (audioBase64 && analysisResult.transcription && analysisResult.transcription !== 'N/A') {
          setQuery(analysisResult.transcription);
          setAudioBase64(null);
          setAudioBlob(null);
          setShowTranscriptionToast(true);
          setTimeout(() => setShowTranscriptionToast(false), 5000);
      }

      setAppState(AppState.READY);
      setUiStep('RESULT');
    } catch (err) {
      console.error("Search failed", err);
      setError("Failed to analyze complaint.");
      setAppState(AppState.READY);
      setUiStep('INPUT'); // Remain on input
    }
  };

  const handleGenerateDraft = async () => {
     if (!analysis) return;
     setIsDrafting(true);
     try {
         const finalNarrative = (analysis.transcription && analysis.transcription !== 'N/A') 
            ? analysis.transcription : query;
         const draft = await generateFIRDraft(finalNarrative, analysis);
         setFirDraft(draft);
     } catch (err) {
         setError("Failed to generate draft FIR.");
     } finally {
         setIsDrafting(false);
     }
  };

  const handleReset = () => {
    setQuery('');
    setAudioBase64(null);
    setAudioBlob(null);
    setEvidenceImage(null);
    setAnalysis(null);
    setResults([]);
    setShowTranscriptionToast(false);
    setFirDraft(null);
    setUiStep('WELCOME');
  };

  const runRedTeamTests = async () => {
    if (appState !== AppState.READY) return;
    setRunningTests(true);
    setTestResults([]);
    const results: TestResult[] = [];
    for (const testCase of redTeamScenarios) {
        try {
            const queryVector = await generateEmbedding(testCase.narrative);
            const searchResults = vectorStore.search(queryVector, 3);
            const matchedChunks = searchResults.map(r => r.chunk);
            const analysis = await analyzeComplaint(testCase.narrative, matchedChunks);
            const isPass = analysis.classification === testCase.expected_classification;
            results.push({
                ...testCase,
                actual_classification: analysis.classification,
                bns_section_found: analysis.bns_section,
                reasoning: analysis.reasoning,
                pass: isPass
            });
            setTestResults([...results]);
        } catch (e) {
            console.error(e);
        }
    }
    setRunningTests(false);
  };

  if (uiStep === 'LANDING') {
      return <LandingPage onEnter={handleEnterApp} />;
  }

  return (
    <div className="relative min-h-screen w-full font-sans text-white overflow-x-hidden selection:bg-white/30 selection:text-white flex flex-col items-center justify-center p-4">
      
      {/* GLOBAL ENVIRONMENT BACKGROUND */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,#001f3f_0%,#000510_60%,#000000_100%)] pointer-events-none"></div>
      
      {/* Light Trails (Subtle) */}
      <div className="fixed bottom-0 left-0 w-full h-1/2 z-0 pointer-events-none overflow-hidden mask-gradient-b opacity-50">
        <div className="light-trail bg-red-600/20 top-[60%] animate-trail-right-1"></div>
        <div className="light-trail bg-amber-200/10 top-[70%] animate-trail-left-1"></div>
      </div>

      <style>{`
        .mask-gradient-b { mask-image: linear-gradient(to bottom, transparent, black); }
        .light-trail { position: absolute; height: 4px; width: 150px; border-radius: 4px; filter: blur(8px); opacity: 0; box-shadow: 0 0 10px currentColor; }
        .animate-trail-right-1 { animation: trail-right 7s linear infinite; width: 200px; }
        .animate-trail-left-1 { animation: trail-left 9s linear infinite; width: 300px; animation-delay: 1s; }
        @keyframes trail-right { 0% { transform: translateX(-100vw); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateX(100vw); opacity: 0; } }
        @keyframes trail-left { 0% { transform: translateX(100vw); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateX(-100vw); opacity: 0; } }
      `}</style>

      {/* FIR Modal */}
      {firDraft && <FIRModal content={firDraft} onClose={() => setFirDraft(null)} />}

      {/* BOOT SCREEN */}
      {uiStep === 'BOOT' && (
          <div className="relative z-10 w-full max-w-md text-center space-y-8 animate-fade-in">
             <div className="mx-auto w-24 h-24 bg-white/10 backdrop-blur-md rounded-[32px] border border-white/20 flex items-center justify-center shadow-2xl">
                 <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                 </svg>
             </div>
             <div>
                <h2 className="text-2xl font-light tracking-wide text-white">System Initialization</h2>
                <p className="text-white/60 mt-2">Loading BNS Knowledge Base...</p>
             </div>
             <ProcessingStatus total={chunks.length || 100} current={processedCount} status={appState === AppState.INDEXING ? "Indexing..." : "Booting..."} />
          </div>
      )}

      {/* MAIN CONTAINER (THE PLATTER) */}
      {(uiStep === 'WELCOME' || uiStep === 'INPUT' || uiStep === 'ANALYZING' || uiStep === 'RESULT') && (
        <div className="relative z-10 w-full max-w-[800px] animate-fade-in-up transition-all duration-500">
           
           <div className="
              backdrop-blur-[40px] 
              bg-[#1e1e1e]/60
              border border-white/10 
              rounded-[32px] 
              p-8 md:p-10 
              shadow-2xl 
              flex flex-col 
              gap-8
           ">
              
              {/* WELCOME VIEW */}
              {uiStep === 'WELCOME' && (
                 <div className="text-center space-y-8 py-8">
                    <h1 className="text-4xl md:text-5xl font-extralight tracking-tight">
                       Citizen Grievance <span className="font-semibold text-emerald-400">Assistant</span>
                    </h1>
                    <p className="text-lg text-white/60 max-w-lg mx-auto leading-relaxed">
                       AI-powered triage for legal complaints under Bharatiya Nyaya Sanhita (BNS) 2023.
                    </p>
                    <button 
                       onClick={() => setUiStep('INPUT')}
                       className="
                          bg-white text-black 
                          font-semibold text-lg 
                          px-8 py-4 
                          rounded-full 
                          shadow-[0_0_20px_rgba(255,255,255,0.3)]
                          hover:scale-[1.02] active:scale-[0.98]
                          transition-all duration-300
                       "
                    >
                       Start New Complaint
                    </button>
                 </div>
              )}

              {/* CONSOLIDATED INPUT / RESULT VIEW */}
              {(uiStep === 'INPUT' || uiStep === 'ANALYZING' || uiStep === 'RESULT') && (
                 <>
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <button onClick={() => setUiStep('WELCOME')} className="text-white/40 hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                           Home
                        </button>
                        {uiStep === 'RESULT' && (
                           <button onClick={handleReset} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                              Reset Form
                           </button>
                        )}
                    </div>

                    {/* PERMANENT INPUT SECTION */}
                    <div className="space-y-4">
                        <label className="text-2xl font-light text-white">What happened?</label>
                        
                        <div className="relative">
                            {/* TEXT AREA / DEPTH LAYER */}
                            {audioBase64 ? (
                                <div className="w-full h-48 rounded-[20px] bg-black/30 flex flex-col items-center justify-center gap-4 border border-white/5">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                                    <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 2.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                                </div>
                                <div className="text-emerald-400 font-medium">Audio Recorded</div>
                                <button onClick={clearAudio} className="text-xs text-white/40 hover:text-white">Delete</button>
                                </div>
                            ) : (
                                <textarea 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Describe the incident..."
                                className="
                                    w-full h-48 
                                    bg-black/30 
                                    text-white placeholder-white/30
                                    text-lg 
                                    rounded-[20px] 
                                    border-none 
                                    p-6 
                                    resize-none 
                                    focus:ring-2 focus:ring-white/20 focus:outline-none
                                "
                                />
                            )}

                            {/* TOOLBAR (Glass Buttons) */}
                            {!audioBase64 && (
                                <div className="absolute bottom-4 left-4 flex gap-3">
                                <button 
                                    onClick={toggleRecording}
                                    className={`
                                        w-12 h-12 rounded-full 
                                        flex items-center justify-center 
                                        backdrop-blur-md transition-all duration-300
                                        ${isRecording ? 'bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-110' : 'bg-white/10 hover:bg-white/20 hover:scale-105'}
                                    `}
                                >
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 2.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                                </button>
                                
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="
                                        w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 
                                        flex items-center justify-center 
                                        backdrop-blur-md hover:scale-105 transition-all
                                    "
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </div>
                            )}
                        </div>
                        
                        {evidenceImage && (
                            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-[20px] border border-white/5">
                                <img src={evidenceImage} className="w-16 h-16 rounded-xl object-cover" alt="evidence" />
                                <div className="flex-1">
                                <div className="text-white font-medium">Evidence Attached</div>
                                <div className="text-white/40 text-sm">Image included in analysis</div>
                                </div>
                                <button onClick={clearImage} className="text-white/40 hover:text-white">✕</button>
                            </div>
                        )}

                        {/* ANALYZE BUTTON (Pill Shape) */}
                        <button 
                            onClick={handleSearch}
                            disabled={(!query.trim() && !audioBase64) || uiStep === 'ANALYZING'}
                            className="
                                w-full py-4 rounded-full 
                                bg-white text-black font-semibold text-lg
                                hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100
                                transition-all duration-300 shadow-lg
                                mt-4 flex items-center justify-center gap-2
                            "
                        >
                            {uiStep === 'ANALYZING' ? 'Analyzing...' : (uiStep === 'RESULT' ? 'Re-Analyze Complaint' : 'Analyze Complaint')}
                        </button>
                    </div>

                    {/* ANALYZING SPINNER */}
                    {uiStep === 'ANALYZING' && (
                       <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
                          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                          <div className="text-sm font-light text-white/60">Processing Evidence...</div>
                       </div>
                    )}

                    {/* RESULT HUD (Slides in below) */}
                    {analysis && uiStep !== 'ANALYZING' && (
                       <div className="animate-fade-in-up border-t border-white/10 pt-8">
                          <LegalResults 
                              results={results} 
                              analysis={analysis} 
                              loading={false} 
                              onGenerateFIR={handleGenerateDraft}
                              isDrafting={isDrafting}
                          />
                       </div>
                    )}
                 </>
              )}
           </div>
        </div>
      )}

      {/* RESTORED RED TEAM TOGGLE (Fixed Outside) */}
      <button 
          onClick={() => setShowRedTeam(!showRedTeam)}
          className="fixed bottom-5 right-5 z-50 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-5 py-3 rounded-full transition-all flex items-center gap-3 font-medium border border-white/10 shadow-lg hover:scale-105 active:scale-95 group"
      >
          <span className="text-xl">🐞</span>
          <span className="text-xs uppercase tracking-wider font-bold opacity-80 group-hover:opacity-100">Diagnostics</span>
      </button>
           
      {/* RED TEAM CONSOLE (Wide-Screen Developer Terminal) */}
      {showRedTeam && (
          <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl w-full max-w-[90vw] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                  {/* Header Bar */}
                  <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5 shrink-0">
                      <h3 className="text-white font-bold flex items-center gap-3 text-lg">
                         <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_#f43f5e]"></span>
                         Red Team Diagnostics Terminal
                      </h3>
                      <div className="flex gap-4">
                        <button onClick={runRedTeamTests} disabled={runningTests} className="px-6 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors text-white disabled:opacity-50 shadow-lg">
                            {runningTests ? 'Running Scenario Tests...' : 'Execute Test Suite'}
                        </button>
                        <button onClick={() => setShowRedTeam(false)} className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                  </div>
                  
                  {/* Table Header Row */}
                  <div className="grid grid-cols-[3fr_1fr_1fr_0.5fr] gap-6 px-8 py-4 bg-black/40 border-b border-white/10 shrink-0 text-white/40 text-xs font-bold uppercase tracking-widest">
                      <div>Input Narrative</div>
                      <div className="text-center">Expected</div>
                      <div className="text-center">Actual</div>
                      <div className="text-center">Result</div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto bg-black/20">
                      {testResults.length > 0 ? (
                          <div className="divide-y divide-white/5">
                            {testResults.map((r, i) => (
                                <div key={i} className={`grid grid-cols-[3fr_1fr_1fr_0.5fr] gap-6 px-8 py-6 items-start hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.03]'}`}>
                                    {/* Narrative Col */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-2">
                                           <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">{r.id}</span>
                                           <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">{r.type}</span>
                                        </div>
                                        <p className="font-mono text-sm text-white/80 whitespace-normal leading-relaxed break-words">
                                            {r.narrative}
                                        </p>
                                        {r.reasoning && (
                                            <div className="mt-2 text-xs text-white/40 italic pl-3 border-l-2 border-white/10">
                                                Reasoning: {r.reasoning.substring(0, 150)}...
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Expected Col */}
                                    <div className="text-center flex flex-col items-center justify-center h-full">
                                        <div className="text-xs font-medium text-white/70 bg-white/5 px-3 py-2 rounded-lg border border-white/5 inline-block">
                                            {r.expected_classification}
                                        </div>
                                    </div>

                                    {/* Actual Col */}
                                    <div className="text-center flex flex-col items-center justify-center h-full">
                                        <div className={`text-xs font-bold px-3 py-2 rounded-lg border inline-block ${r.pass ? 'text-green-400 bg-green-900/10 border-green-500/20' : 'text-rose-400 bg-rose-900/10 border-rose-500/20'}`}>
                                            {r.actual_classification}
                                        </div>
                                    </div>

                                    {/* Result Col */}
                                    <div className="flex items-center justify-center h-full">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] ${r.pass ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-rose-500/20 border-rose-500 text-rose-400'}`}>
                                            {r.pass ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                              <span className="text-6xl opacity-50">🐞</span>
                              <p className="text-xl font-light">System Diagnostics Idle</p>
                              <p className="text-sm opacity-60">Click 'Execute Test Suite' to begin validation</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;