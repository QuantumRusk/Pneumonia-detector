'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { isMobile, isDesktop } from 'react-device-detect';
import { useDropzone } from 'react-dropzone';
import CameraCapture from './components/CameraCapture';
import dynamic from 'next/dynamic';

const DynamicDownloadButton = dynamic(
  () => import('./components/PdfDownloader').then(mod => mod.DownloadReportButton),
  {
    ssr: false, // Disables server-side rendering execution
    loading: () => (
      <button disabled className="w-full py-3 rounded-xl bg-gray-700 text-gray-400 cursor-not-allowed font-medium">
        Loading PDF Engine...
      </button>
    ),
  }
);


// ------- Results Card Component -------
interface ResultsCardProps {
  result: {
    'Bacterial Pneumonia'?: number;
    Normal?: number;
    'Viral Pneumonia'?: number;
    _note?: string;
    error?: string;
    prediction?: string; // Added: comes from backend now
    scan_id?: number;
    scan_date?: string;
    patient_name?: string;
  };
}

const ResultsCard: React.FC<ResultsCardProps> = ({ result }) => {
  if (!result) return null;

  if (result.error) {
    return (
      <div className="mt-6 p-6 bg-red-900/30 border border-red-500/50 rounded-2xl text-center animate-fadeIn">
        <p className="text-red-400 font-medium">{result.error}</p>
      </div>
    );
  }

  // Use backend prediction if available, otherwise calculate
  const prediction = result.prediction || 'Unknown';
  const normalScore = result.Normal ?? 0;
  const bacterialScore = result['Bacterial Pneumonia'] ?? 0;
  const viralScore = result['Viral Pneumonia'] ?? 0;

  const isNormal = prediction === 'Normal';
  const headerColor = isNormal ? 'text-green-400' : 'text-red-400';
  const headerBg = isNormal ? 'bg-green-400/10 border-green-400/30' : 'bg-red-400/10 border-red-400/30';

  const metrics = [
    { label: 'Normal', value: normalScore, color: 'bg-green-500', bg: 'bg-green-900/40' },
    { label: 'Bacterial Pneumonia', value: bacterialScore, color: 'bg-red-500', bg: 'bg-red-900/40' },
    { label: 'Viral Pneumonia', value: viralScore, color: 'bg-orange-500', bg: 'bg-orange-900/40' },
  ];

  return (
    <div className="mt-6 p-6 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl animate-fadeIn">
      <div className={`p-4 rounded-xl border ${headerBg} mb-6 text-center`}>
        <p className="text-gray-400 text-sm uppercase tracking-wide mb-1">Diagnosis</p>
        <h2 className={`text-3xl font-bold ${headerColor}`}>{prediction}</h2>
        {result.scan_date && (
          <p className="text-gray-500 text-xs mt-2">
            Scan ID: {result.scan_id} • {new Date(result.scan_date).toLocaleString()}
          </p>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-gray-300 font-medium text-lg mb-4 text-center">Confidence Breakdown</h3>
        <div className="flex flex-col gap-5">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-gray-300 font-medium">{metric.label}</span>
                <span className="text-gray-400 font-semibold">{metric.value.toFixed(1)}%</span>
              </div>
              <div className={`w-full h-3 rounded-full ${metric.bg} overflow-hidden`}>
                <div className={`h-full rounded-full ${metric.color} transition-all duration-1000 ease-out`} 
                     style={{ width: `${Math.min(metric.value, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {result._note && (
        <div className="p-3 bg-gray-900/60 border border-gray-700/60 rounded-xl">
          <p className="text-gray-400 text-xs leading-relaxed italic text-center">{result._note}</p>
        </div>
      )}
    </div>
  );
};

// ------- Patient Timeline Component -------
interface ScanHistoryItem {
  scan_id: number;
  scan_date: string;
  prediction: string;
  normal_score: number;
  bacterial_score: number;
  viral_score: number;
  patient_name?: string;  // <-- Added this to fix the typescript error
  patient_id?: string;
}

interface PatientTimelineProps {
  history: ScanHistoryItem[];
  patientName: string;
  patientId: string;
}

const PatientTimeline: React.FC<PatientTimelineProps> = ({ history, patientName, patientId }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(history.length / itemsPerPage);

  if (history.length === 0) return null;

  const oldestScan = history[history.length - 1];
  const oldestDateTime = new Date(oldestScan.scan_date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const getFinalDecision = (prediction: string) => {
    if (prediction === 'Normal') return 'Normal';
    if (prediction.includes('Bacterial')) return 'Bacterial Pneumonia';
    if (prediction.includes('Viral')) return 'Viral Pneumonia';
    return prediction;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (dateString: string) => {
    // If the backend string doesn't specify a timezone offset, append 'Z' to treat it as UTC
    const standardizedDate = dateString.endsWith('Z') || dateString.includes('+') 
      ? dateString 
      : `${dateString}Z`;
      
    return new Date(standardizedDate).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Slice the history array for current page
  const startIdx = currentPage * itemsPerPage;
  const pageItems = history.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="mt-8 p-6 bg-gray-800/50 rounded-2xl border border-gray-700 animate-fadeIn">
      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
        <p className="text-sm text-blue-300/80 text-center">
          <span className="font-semibold">Patient {oldestScan.patient_name || patientName}</span>’s first scan was performed on{' '}
          <span className="font-semibold text-white">{oldestDateTime}</span>
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl bg-gray-900 border border-gray-700 shadow-xl">
  <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
    {/* Explicit Column Width Allocations */}
    <colgroup>
      <col style={{ width: '8%' }} />   {/* Sr. No */}
      <col style={{ width: '22%' }} />  {/* Patient Name */}
      <col style={{ width: '15%' }} />  {/* Patient ID */}
      <col style={{ width: '20%' }} />  {/* Date */}
      <col style={{ width: '15%' }} />  {/* Time */}
      <col style={{ width: '20%' }} />  {/* Final Decision */}
    </colgroup>
    
    <thead>
      <tr className="bg-gray-800 text-gray-300 text-xs uppercase font-bold tracking-wider" style={{ borderBottom: '2px solid #4b5563' }}>
        <th className="px-3 py-3 text-center" style={{ borderRight: '1px solid #4b5563' }}>Sr. No</th>
        <th className="px-4 py-3 text-left" style={{ borderRight: '1px solid #4b5563' }}>Patient Name</th>
        <th className="px-4 py-3 text-center" style={{ borderRight: '1px solid #4b5563' }}>Patient ID</th>
        <th className="px-4 py-3 text-left" style={{ borderRight: '1px solid #4b5563' }}>Date</th>
        <th className="px-4 py-3 text-left" style={{ borderRight: '1px solid #4b5563' }}>Time</th>
        <th className="px-4 py-3 text-center">Final Decision</th>
      </tr>
    </thead>
    <tbody>
      {pageItems.map((scan, idx) => {
        const final = getFinalDecision(scan.prediction);
        const isLatest = (startIdx + idx) === 0;
        return (
          <tr 
            key={scan.scan_id} 
            className="transition-colors hover:bg-gray-800/50 text-gray-200"
            style={{ 
              borderBottom: '1px solid #374151',
              backgroundColor: isLatest ? 'rgba(30, 58, 138, 0.2)' : 'transparent' 
            }}
          >
            <td className="py-4 text-center font-medium text-gray-500" style={{ borderRight: '1px solid #374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {startIdx + idx + 1}
            </td>
            
            {/* FIXED: Now reads the specific name saved in this history row log */}
            <td className="py-4 px-4 font-semibold text-gray-200" style={{ borderRight: '1px solid #374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {scan.patient_name || patientName}
            </td>
            
            {/* FIXED: Now reads the specific ID saved in this history row log */}
            <td className="py-4 px-4 text-gray-400 font-mono text-center" style={{ borderRight: '1px solid #374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {scan.patient_id || patientId}
            </td>
            
            <td className="py-4 px-4 text-gray-300 text-left" style={{ borderRight: '1px solid #374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {formatDate(scan.scan_date)}
            </td>
            <td className="py-4 px-4 text-gray-400 text-left" style={{ borderRight: '1px solid #374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {formatTime(scan.scan_date)}
            </td>
            <td className="py-4 px-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  final === 'Normal' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  final.includes('Bacterial') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`}>
                  {final}
                </span>
                {isLatest && (
                  <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-blue-500 text-white rounded font-black shadow-sm shrink-0">
                   - {" "} Latest
                  </span>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>

      {/* Pagination arrows */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-600">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              currentPage === 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            ← Previous
          </button>
          <span className="text-gray-400 text-sm">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              currentPage >= totalPages - 1
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

// ------- Loading Overlay Component -------
const LoadingOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-2xl p-10 border border-gray-700 shadow-2xl flex flex-col items-center gap-6 animate-fadeIn">
        <div className="relative">
          <svg className="w-16 h-16 text-purple-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 border-2 border-purple-400/20 rounded-full animate-spin" />
          </div>
        </div>
        <p className="text-white text-xl font-semibold">Analyzing X-Ray...</p>
        <p className="text-gray-400 text-sm">AI is examining the image</p>
                <div className="flex gap-2">
          <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
};

// ------- Main Home Component -------
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NEW: Patient tracking states
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
// ... existing state variables ...
  const resetAnalysisStates = () => {
  setPredictionResult(null);         // clear old diagnostic result
  setViewMode('original');           // reset image viewer toggle
  setOriginalImageBase64(null);      // clear base64 image used for PDF & viewer
};

  // NEW: Add these for the image viewer
  const [viewMode, setViewMode] = useState<'original' | 'heatmap'>('original');
  

  const [originalImageBase64, setOriginalImageBase64] = useState<string | null>(null);

  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
  // When the ID changes we flush everything and try to get a fresh history
  resetAnalysisStates();
  if (patientId) {
    fetchPatientHistory(patientId);
  } else {
    setScanHistory([]);   // clear history when ID is empty
  }
}, [patientId]);
  

  // NEW: Fetch patient history
  const fetchPatientHistory = useCallback(async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/history/${id}`);
      if (response.ok) {
        const data = await response.json();
        setScanHistory(data.scan_history || []);
      } else {
        setScanHistory([]);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setScanHistory([]);
    }
  }, []);

  const handleCapture = useCallback((file: File) => {
  resetAnalysisStates();
  setSelectedImage(file);
  setShowCamera(false);
  setPredictionResult(null);
  // Convert to base64 for PDF
  const reader = new FileReader();
  reader.onloadend = () => setOriginalImageBase64(reader.result as string);
  reader.readAsDataURL(file);
}, []);

const handleFileSelect = useCallback((file: File) => {
  resetAnalysisStates();
  setSelectedImage(file);
  setPredictionResult(null);
  const reader = new FileReader();
  reader.onloadend = () => setOriginalImageBase64(reader.result as string);
  reader.readAsDataURL(file);
}, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) handleFileSelect(acceptedFiles[0]);
  }, [handleFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  const handleGalleryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) handleFileSelect(files[0]);
  };

  // UPDATED: Handle analysis with patient data
  const handleAnalyze = async () => {
    if (!selectedImage) return;
    if (!patientName.trim() || !patientId.trim()) {
      setPredictionResult({ error: 'Please enter patient name and ID before analyzing.' });
      return;
    }

    setLoading(true);
    setPredictionResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('patient_name', patientName);
      formData.append('patient_id', patientId);

      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });

       if (!response.ok) {
        const errData = await response.json();
        // Captures any explicit error message sent from our FastAPI backend 
        if (errData.detail) {
          setPredictionResult({ error: errData.detail });
          return; // Exits early safely so it doesn't drop into the generic catch text
        }
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      console.log("RAW BACKEND RESPONSE:", data);
      setPredictionResult(data);

      // NEW: Fetch history immediately after successful scan
      await fetchPatientHistory(patientId);
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      setPredictionResult({ error: 'Failed to analyze X-ray. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  const mobileDevice = isMobile;
  const desktopDevice = isDesktop;

  // NEW: Determine whether we have a valid, error-free prediction to attach a PDF to
  const hasValidPrediction =
    predictionResult &&
    !predictionResult.error &&
    !!predictionResult.prediction;

  // NEW: Build the confidence scores object the MedicalReport component expects.
  // ASSUMPTION: predictionResult doesn't carry a `confidence_scores` key directly —
  // the three scores arrive as separate top-level fields — so we assemble it here.
  const confidenceScores = hasValidPrediction
    ? {
        normal: predictionResult.Normal ?? 0,
        bacterial: predictionResult['Bacterial Pneumonia'] ?? 0,
        viral: predictionResult['Viral Pneumonia'] ?? 0,
      }
    : null;

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative">
      {loading && <LoadingOverlay />}

      {/* Patient Info Inputs - shown at top for both mobile/desktop */}
      <div className="w-full max-w-md mb-6 space-y-4">
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          Pneumonia Detection System
        </h1>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => {setPatientName(e.target.value);
                resetAnalysisStates();
              }}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Patient ID</label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => {setPatientId(e.target.value);
                resetAnalysisStates();
              }}
              placeholder="e.g., P12345"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {mobileDevice ? (
        <div className="w-full max-w-md flex flex-col gap-3 items-center">
          <p className="text-gray-400 text-center text-sm mb-1">Choose a method to upload X-ray</p>

          <button
            onClick={() => setShowCamera(true)}
            className="w-48 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm shadow-md flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Scan via Camera
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-48 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium text-sm shadow-md flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Choose from Gallery
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleGalleryChange} className="hidden" />
        </div>
     ) : desktopDevice ? (
        <div className="w-full flex justify-center items-center">
          <div
            {...getRootProps()}
            style={{
              width: '220px',          // Matches the exact width of your Download Button
              height: '140px',         // Compact height box
              border: '2px dashed #4b5563',
              borderRadius: '12px',
              backgroundColor: 'rgba(17, 24, 39, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '12px',
              transition: 'all 0.2s ease'
            }}
            className="hover:border-blue-500 hover:bg-gray-800/50"
          >
            <input {...getInputProps()} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <svg style={{ width: '24px', height: '24px', color: '#6b7280', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p style={{ color: '#d1d5db', fontSize: '13px', fontWeight: '500', margin: 0 }}>Drag & drop X-ray</p>
              <p style={{ color: '#9ca3af', fontSize: '11px', margin: 0 }}>or click to browse</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-white text-center">Device not supported</div>
      )}

      {showCamera && <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />}

      {selectedImage && (
        <div className="mt-8 w-full max-w-sm">
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl mb-4">
            <p className="text-green-400 text-center text-sm">
              ✓ Ready: <span className="text-gray-300">{selectedImage.name}</span>
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !patientName || !patientId}
                className={`w-full py-2.5 rounded-xl font-medium text-base shadow-lg transition-colors flex items-center justify-center gap-2
              ${loading || !patientName || !patientId ? 'bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Analyze with AI
              </>
            )}
          </button>

          {/* NEW: Image Viewer with Original/Heatmap Toggle */}
          {/* NEW: Image Viewer with Original/Heatmap Toggle */}
          {predictionResult && predictionResult.heatmap_url && originalImageBase64 && (
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 mt-6 animate-fadeIn w-full flex flex-col items-center">
              <div className="flex justify-center gap-2 mb-4">
                <button
                  onClick={() => setViewMode('original')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    viewMode === 'original'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Original Image
                </button>
                <button
                  onClick={() => setViewMode('heatmap')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    viewMode === 'heatmap'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  AI Heatmap (Grad-CAM)
                </button>
              </div>

              {/* Natural flex block wrapper */}
              <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
                <img
                  src={
                    viewMode === 'original'
                      ? originalImageBase64
                      : predictionResult.heatmap_url?.startsWith('http')
                        ? predictionResult.heatmap_url
                        : `http://localhost:8000${predictionResult.heatmap_url}`
                  }
                  alt={viewMode === 'original' ? 'Original X-Ray' : 'AI Heatmap'}
                  style={{
                    width: '220px',          // Forces image width profile to match the buttons
                    maxHeight: '260px',      // Caps total vertical space
                    objectFit: 'contain',    // Fits without cropping or overflowing
                    borderRadius: '8px',
                    border: '1px solid #374151',
                    backgroundColor: '#000000',
                    display: 'block'
                  }}
                />
              </div>

              {viewMode === 'heatmap' && (
                <div className="mt-3 px-3 py-2 bg-blue-900/20 border border-blue-800/30 rounded-lg max-w-xs">
                  <p className="text-[11px] text-blue-300/80 text-center leading-relaxed m-0">
                    <span className="font-semibold">🔬 AI Focus Analysis:</span>{' '}
                    <span className="text-red-400 font-medium">Red/Orange</span> regions indicate high diagnostic focus.
                  </p>
                </div>
              )}
            </div>
          )}

          {predictionResult && !loading && <ResultsCard result={predictionResult} />}

                    {/* NEW: PDF Report Download Button */}
          {/* NEW: PDF Report Download Button (Dynamically Loaded) */}
{/* NEW: PDF Report Download Button (Dynamically Loaded) */}
          {hasValidPrediction && !loading && confidenceScores && (
            <div className="mt-6 w-full flex justify-center items-center">
              <DynamicDownloadButton
                patientName={patientName}
                patientId={patientId}
                diagnosis={predictionResult.prediction || 'Unknown'}
                confidenceScores={confidenceScores}
                date={new Date().toLocaleString()}
                originalImageURL={originalImageBase64  ?? undefined}          
                heatmapURL={predictionResult.heatmap_url?.startsWith('http') 
                  ? predictionResult.heatmap_url 
                  : `http://localhost:8000${predictionResult.heatmap_url}`}
              />
            </div>
          )}
          
          {/* NEW: Patient Timeline */}
          {scanHistory.length > 0 && (
  <PatientTimeline history={scanHistory} patientName={patientName} patientId={patientId} />
)}
        </div>
      )}
    </main>
  );
}