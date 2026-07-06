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
}

interface PatientTimelineProps {
  history: ScanHistoryItem[];
  patientName: string;
}

const PatientTimeline: React.FC<PatientTimelineProps> = ({ history, patientName }) => {
  if (history.length <= 1) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getDotColor = (prediction: string) => {
    if (prediction === 'Normal') return 'bg-green-500';
    if (prediction.includes('Bacterial')) return 'bg-red-500';
    if (prediction.includes('Viral')) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  return (
    <div className="mt-8 p-6 bg-gray-800/50 rounded-2xl border border-gray-700 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">
          Patient Timeline: <span className="text-blue-400">{patientName}</span>
        </h3>
        <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
          {history.length} scans total
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700"></div>
        <div className="space-y-6">
          {history.map((scan, index) => (
            <div key={scan.scan_id} className="relative flex items-start">
              <div className={`absolute left-2 mt-2 h-4 w-4 rounded-full border-2 border-gray-800 shadow ${getDotColor(scan.prediction)}`}></div>
              <div className="ml-10 flex-1 bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300 font-medium">{formatDate(scan.scan_date)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    scan.prediction === 'Normal' ? 'bg-green-900/50 text-green-400' :
                    scan.prediction.includes('Bacterial') ? 'bg-red-900/50 text-red-400' :
                    'bg-orange-900/50 text-orange-400'
                  }`}>
                    {scan.prediction}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-gray-900/50 p-2 rounded">
                    <span className="block text-gray-500 mb-1">Normal</span>
                    <span className="text-gray-300 font-semibold">{scan.normal_score?.toFixed(1)}%</span>
                  </div>
                  <div className="bg-gray-900/50 p-2 rounded">
                    <span className="block text-gray-500 mb-1">Bacterial</span>
                    <span className="text-gray-300 font-semibold">{scan.bacterial_score?.toFixed(1)}%</span>
                  </div>
                  <div className="bg-gray-900/50 p-2 rounded">
                    <span className="block text-gray-500 mb-1">Viral</span>
                    <span className="text-gray-300 font-semibold">{scan.viral_score?.toFixed(1)}%</span>
                  </div>
                </div>
                {index === 0 && (
                  <span className="absolute top-4 right-4 text-xs text-blue-400 font-medium bg-blue-900/20 px-2 py-0.5 rounded">
                    Latest
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
        <p className="text-xs text-blue-300/80 text-center">
          <span className="font-semibold">Clinical Note:</span> Timeline shows progression from most recent (top) to oldest (bottom). Compare confidence trends to assess improvement.
        </p>
      </div>
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

  useEffect(() => {
    setMounted(true);
  }, []);

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
    setSelectedImage(file);
    setShowCamera(false);
    setPredictionResult(null);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedImage(file);
    setPredictionResult(null);
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
        const errorText = await response.text();
        throw new Error(errorText || 'Analysis failed');
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
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Patient ID</label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g., P12345"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {mobileDevice ? (
        <div className="w-full max-w-md flex flex-col gap-6 items-center">
          <p className="text-gray-400 text-center mb-2">Choose a method to upload X-ray</p>

          <button
            onClick={() => setShowCamera(true)}
            className="w-full px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-lg shadow-lg flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Scan via Camera
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-8 py-4 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium text-lg shadow-lg flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Choose from Gallery
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleGalleryChange} className="hidden" />
        </div>
      ) : desktopDevice ? (
        <div className="w-full max-w-lg flex flex-col items-center">
          <div
            {...getRootProps()}
            className={`w-full p-12 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-400 bg-blue-400/10' : 'border-gray-600 bg-gray-900/50 hover:border-blue-400 hover:bg-gray-800'}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              {isDragActive ? (
                <p className="text-blue-400 text-lg font-medium">Drop your X-ray image here...</p>
              ) : (
                <>
                  <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-300 text-lg font-medium">Drag & drop your X-ray image here</p>
                  <p className="text-gray-500 text-sm">or click to browse from your files</p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-white text-center">Device not supported</div>
      )}

      {showCamera && <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />}

      {selectedImage && (
        <div className="mt-8 w-full max-w-md">
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl mb-4">
            <p className="text-green-400 text-center text-sm">
              ✓ Ready: <span className="text-gray-300">{selectedImage.name}</span>
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !patientName || !patientId}
            className={`w-full py-3 rounded-xl font-medium text-base shadow-lg transition-colors flex items-center justify-center gap-2
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

          {predictionResult && !loading && <ResultsCard result={predictionResult} />}

                    {/* NEW: PDF Report Download Button */}
          {/* NEW: PDF Report Download Button (Dynamically Loaded) */}
{hasValidPrediction && !loading && confidenceScores && (
  <div className="mt-6">
    <DynamicDownloadButton
      patientName={patientName}
      patientId={patientId}
      diagnosis={predictionResult.prediction || 'Unknown'}
      confidenceScores={confidenceScores}
      date={new Date().toLocaleString()}
    />
  </div>
)}
          
          {/* NEW: Patient Timeline */}
          {scanHistory.length > 1 && (
            <PatientTimeline history={scanHistory} patientName={patientName} />
          )}
        </div>
      )}
    </main>
  );
}