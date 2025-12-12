import React from 'react';

interface FIRModalProps {
  content: string;
  onClose: () => void;
}

export const FIRModal: React.FC<FIRModalProps> = ({ content, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
       {/* Modal Container */}
       <div id="fir-modal-content" className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
             <h2 className="text-lg font-semibold text-gray-900">Draft First Information Report</h2>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600 no-print">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-10 font-mono text-sm leading-relaxed text-gray-800 whitespace-pre-wrap bg-white selection:bg-gray-200">
             {content}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 no-print">
             <button onClick={onClose} className="px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                Close
             </button>
             <button onClick={() => window.print()} className="px-6 py-3 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 shadow-lg flex items-center gap-2 transition-transform active:scale-95">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print Document
             </button>
          </div>
       </div>
       <style>{`
          @media print {
            body > * { visibility: hidden; }
            #fir-modal-content { visibility: visible; position: fixed; left: 0; top: 0; width: 100%; height: 100%; margin: 0; border-radius: 0; box-shadow: none; overflow: visible; }
            #fir-modal-content * { visibility: visible; }
            .no-print { display: none !important; }
          }
       `}</style>
    </div>
  );
};