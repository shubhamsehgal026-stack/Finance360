import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setStatus('uploading');
    
    // Simulating Excel parsing delay
    setTimeout(() => {
        // In a real app, this is where we'd use `xlsx` or `read-excel-file`
        // const reader = new FileReader();
        // reader.readAsArrayBuffer(file);
        
        setStatus('success');
        setTimeout(() => {
            onUploadComplete();
        }, 1000);
    }, 2000);
  };

  return (
    <div className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Data Source</h2>
        <p className="text-xs text-slate-500">Last updated: Oct 2023 Board Report.xlsx</p>
      </div>
      
      <div className="flex items-center gap-4">
        {status === 'success' ? (
             <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <CheckCircle size={16} />
                <span>Data Synced</span>
             </div>
        ) : status === 'uploading' ? (
            <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Parsing Excel...</span>
            </div>
        ) : (
            <div className="relative">
                <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 px-4 py-2 rounded-lg border border-slate-200 hover:border-blue-200"
                >
                    <Upload size={16} />
                    <span>Update Data</span>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;