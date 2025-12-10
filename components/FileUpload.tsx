import React, { useRef } from 'react';

interface FileUploadProps {
  onFileLoaded: (text: string, fileName: string) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      onFileLoaded(text, file.name);
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 transition-colors cursor-pointer group"
         onClick={() => !disabled && fileInputRef.current?.click()}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".txt,.md"
        disabled={disabled}
      />
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 text-slate-400 group-hover:text-blue-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
        </div>
        <p className="text-lg font-medium text-slate-700">Upload BNS Text File</p>
        <p className="text-sm text-slate-500">Click to browse or drop your .txt file here</p>
      </div>
    </div>
  );
};
