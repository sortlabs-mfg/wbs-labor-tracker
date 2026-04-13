'use client';

import { useState, useRef, DragEvent } from 'react';

interface ImportResult {
  imported: number;
  skippedPayType: number;
  skippedNonExpense: number;
  skippedNotDefined: number;
  importBatch: string;
}

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are supported.');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/import', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Import failed');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Import Time Data</h1>

      {/* Upload Zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-[#185FA5] bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-[#185FA5] hover:bg-blue-50'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={onInputChange}
          className="hidden"
        />
        {uploading ? (
          <div className="space-y-2">
            <div className="w-8 h-8 border-4 border-[#185FA5] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 text-sm">Importing...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📂</div>
            <p className="text-slate-700 font-medium">Drop a CSV file here or click to browse</p>
            <p className="text-slate-400 text-sm">Paylocity export format (.csv)</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-green-800">Import Complete</h2>
          <p className="text-xs text-slate-500 font-mono">Batch: {result.importBatch}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-green-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[#1D9E75]">{result.imported}</div>
              <div className="text-xs text-slate-500 mt-0.5">Rows Imported</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-500">{result.skippedPayType}</div>
              <div className="text-xs text-slate-500 mt-0.5">Skipped (Pay Type)</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-500">{result.skippedNonExpense}</div>
              <div className="text-xs text-slate-500 mt-0.5">Skipped (NONEXPENSE)</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-500">{result.skippedNotDefined}</div>
              <div className="text-xs text-slate-500 mt-0.5">Skipped (Not Defined)</div>
            </div>
          </div>
        </div>
      )}

      {/* Format Reference */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Expected CSV Columns</h3>
        <div className="grid grid-cols-2 gap-1 text-xs text-slate-500 font-mono">
          {[
            'Employee Id',
            'Pay Type Description',
            'Work Date',
            'First Name',
            'Last Name',
            'WBS Code',
            'WBS Code Name',
            'Positions',
            'Positions Name',
            'Paid Duration (hours)',
            'Employee Notes',
            'Supervisor Notes',
            'Jobs',
            'Jobs Name',
          ].map((col) => (
            <div key={col} className="bg-white border border-slate-200 rounded px-2 py-0.5">
              {col}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Rows with Pay Type = Lunch/Sick/Vacation/Holiday, Jobs = &quot;Not Defined&quot;, or WBS Code = NONEXPENSE are automatically skipped.
          Duplicate file imports (same filename + date) are blocked.
        </p>
      </div>
    </div>
  );
}
