'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { isMobile, isDesktop } from 'react-device-detect';
import { useDropzone } from 'react-dropzone';
import CameraCapture from '../components/CameraCapture';
import dynamic from 'next/dynamic';

const DynamicDownloadButton = dynamic<any>(
  () => import('../components/PdfDownloader').then(mod => mod.DownloadReportButton),
  {
    ssr: false,
    loading: () => (
      <button disabled className="w-full py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-gray-400 cursor-not-allowed font-medium">
        Loading PDF Engine...
      </button>
    ),
  }
);

// Add this near the top of page.tsx (outside components)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ||'https://pneumonia-backend-app-cggggpdndme5h3fk.centralindia-01.azurewebsites.net/';

// ------- Results Card Component -------
interface ResultsCardProps {
  result: {
    'Bacterial Pneumonia'?: number;
    Normal?: number;
    'Viral Pneumonia'?: number;
    _note?: string;
    error?: string;
    prediction?: string;
    scan_id?: number;
    scan_date?: string;
    patient_name?: string;
  };
  sensitivityMode?: 'standard' | 'high' | 'strict';
  inferenceTime?: number | null;
}

const ResultsCard: React.FC<ResultsCardProps> = ({ result, sensitivityMode = 'standard', inferenceTime = null }) => {
  if (!result) return null;

  if (result.error) {
    return (
      <div className="mt-6 p-6 bg-red-500/10 backdrop-blur-xl border border-red-400/30 rounded-2xl text-center animate-fadeIn shadow-[0_0_30px_rgba(239,68,68,0.15)]">
        <p className="text-red-300 font-medium">{result.error}</p>
      </div>
    );
  }

  const prediction = result.prediction || 'Unknown';
  const normalScore = result.Normal ?? 0;
  const bacterialScore = result['Bacterial Pneumonia'] ?? 0;
  const viralScore = result['Viral Pneumonia'] ?? 0;

  const isNormal = prediction === 'Normal';
  const headerColor = isNormal ? 'text-emerald-300' : 'text-rose-300';
  const headerBg = isNormal
    ? 'bg-emerald-400/5 border-emerald-400/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
    : 'bg-rose-400/5 border-rose-400/30 shadow-[0_0_25px_rgba(244,63,94,0.15)]';

  const getMedicalInsight = () => {
    if (prediction === 'Normal') {
      return {
        title: "Clear Lung Radiograph",
        text: "No acute pulmonary consolidations or abnormal interstitial shadows detected. Clear lung fields. Schedule regular clinical follow-up if respiratory symptoms persist.",
        color: "text-emerald-300",
        border: "border-emerald-400/20"
      };
    } else if (prediction.includes('Bacterial')) {
      return {
        title: "Suspected Lobar Consolidation",
        text: "High probability of localized opacification typical of bacterial infiltration. Recommend immediate clinical correlation, sputum culture profiling, and tracking for targeted antibiotic therapy.",
        color: "text-rose-300",
        border: "border-rose-400/20"
      };
    } else {
      return {
        title: "Diffuse Interstitial Pattern Detected",
        text: "Bilateral patchy/ground-glass opacities suggested, heavily correlating with viral-type pneumonia. Recommended supportive pulmonary monitoring and viral panel verification tests.",
        color: "text-amber-300",
        border: "border-amber-400/20"
      };
    }
  };

  const insight = getMedicalInsight();
  const metrics = [
    { label: 'Normal',              value: normalScore,    from: 'from-emerald-400', to: 'to-emerald-600', track: 'bg-white/5' },
    { label: 'Bacterial Pneumonia', value: bacterialScore, from: 'from-rose-400',    to: 'to-rose-600',    track: 'bg-white/5' },
    { label: 'Viral Pneumonia',     value: viralScore,     from: 'from-amber-400',   to: 'to-amber-600',   track: 'bg-white/5' },
  ];
   // ── FEATURE 1: SENSITIVITY OVERRIDE ──────────────────────────────
  const rawPneumonia = bacterialScore + viralScore;
  let finalDisplayPrediction = prediction;
  let finalInsightTitle = insight.title;
  let finalInsightText = insight.text;
  let finalHeaderColor = headerColor;
  let finalHeaderBg = headerBg;
  let finalInsightColor = insight.color;
  let finalInsightBorder = insight.border;

  // NEW: Check if the AI model is experiencing a flat 50-50 pneumonia deadlock
  const isDeadlocked = Math.abs(bacterialScore - viralScore) < 1 && normalScore < 10;

  if (isDeadlocked) {
    if (sensitivityMode === 'high') {
      // ER Triage Mode: Forcefully favor Bacterial to ensure aggressive antibiotic screening
      finalDisplayPrediction = 'Bacterial Pneumonia (Triage Priority)';
      finalInsightTitle = 'Triage-Forced Bacterial Protocol';
      finalInsightText = 'The underlying AI model hit a 50-50 classification tie. Under High-Sensitivity Triage rules, the system defaults to a Bacterial priority track to trigger immediate diagnostic lab testing and avoid missing critical acute infections.';
      finalHeaderColor = 'text-rose-300';
      finalHeaderBg = 'bg-rose-400/5 border-rose-400/30 shadow-[0_0_25px_rgba(244,63,94,0.15)]';
    } else if (sensitivityMode === 'strict') {
      // Strict Mode: Forcefully drop it to Viral or demand a re-scan due to high uncertainty
      finalDisplayPrediction = 'Viral Pneumonia (Supportive Track)';
      finalInsightTitle = 'Uncertain Classification – Supportive Care Track';
      finalInsightText = 'The system identified a perfect statistical deadlock between bacterial and viral features. Under Strict rules, acute bacterial consolidation cannot be verified. Flagged for supportive monitoring and full laboratory viral panel verification.';
      finalHeaderColor = 'text-amber-300';
      finalHeaderBg = 'bg-amber-400/5 border-amber-400/30 shadow-[0_0_25px_rgba(251,191,36,0.15)]';
    }
  } else if (sensitivityMode === 'high') {
    // Standard ER Triage for borderline Normal inputs
    if (rawPneumonia > 35 && prediction === 'Normal') {
      finalDisplayPrediction = 'Pneumonia Detected (High-Sensitivity Triage)';
      finalInsightTitle = 'Borderline Infiltrate Warning';
      finalInsightText = 'AI Sensitivity is set to High. Subtle pixel opacities detected exceeding triage limits. Recommended clinical isolation and sputum culture monitoring to prevent false negatives.';
      finalHeaderColor = 'text-amber-300';
      finalHeaderBg = 'bg-amber-400/5 border-amber-400/30 shadow-[0_0_25px_rgba(251,191,36,0.15)]';
    }
  } else if (sensitivityMode === 'strict') {
    // Standard Strict Specificity check
    if (rawPneumonia < 65 && prediction !== 'Normal') {
      finalDisplayPrediction = 'Normal';
      finalInsightTitle = 'Sub-Threshold Assessment';
      finalInsightText = 'Pneumonia metrics fell below strict specific limits. Film exhibits clear lung fields with no high-confidence localized consolidations present.';
      finalHeaderColor = 'text-emerald-300';
      finalHeaderBg = 'bg-emerald-400/5 border-emerald-400/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]';
    }
  }

  return (
    <div className="mt-6 p-6 bg-white/3 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.4)] animate-fadeIn">
       <div className={`p-5 rounded-xl border ${finalHeaderBg} mb-6 text-center backdrop-blur-md`}>
        <p className="text-slate-400 text-[11px] uppercase tracking-[0.3em] mb-2">Diagnosis</p>
        <h2 className={`text-3xl font-bold ${finalHeaderColor} drop-shadow-[0_0_18px_rgba(255,255,255,0.15)]`}>
          {finalDisplayPrediction}
        </h2>
        {result.scan_date && (
          <p className="text-slate-500 text-xs mt-2 tracking-wide flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>Scan ID: <span className="text-slate-300 font-mono">{result.scan_id}</span></span>
            <span className="text-slate-600">•</span>
            <span>{new Date(result.scan_date).toLocaleString()}</span>
            {inferenceTime !== null && inferenceTime !== undefined && (
              <>
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 font-mono text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                  ⚡ Latency: {inferenceTime}ms
                </span>
              </>
            )}
          </p>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-linear-to-r from-transparent via-cyan-400/40 to-transparent" />
          <h3 className="text-slate-200 font-medium text-sm uppercase tracking-[0.25em]">Confidence Breakdown</h3>
          <div className="h-px flex-1 bg-linear-to-r from-transparent via-cyan-400/40 to-transparent" />
        </div>
        <div className="flex flex-col gap-5">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-200 font-medium text-sm">{metric.label}</span>
                <span className="text-slate-100 font-mono font-semibold text-sm">{metric.value.toFixed(1)}%</span>
              </div>
              <div className={`w-full h-2.5 rounded-full ${metric.track} border border-white/5 overflow-hidden backdrop-blur-sm`}>
                <div
                  className={`h-full rounded-full bg-linear-to-r ${metric.from} ${metric.to} transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(59,130,246,0.4)]`}
                  style={{ width: `${Math.min(metric.value, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`p-4 bg-white/2 backdrop-blur-md border ${finalInsightBorder} rounded-xl mt-4 mb-4`}>
        <h4 className={`text-[10px] font-bold uppercase tracking-[0.25em] mb-2 ${finalInsightColor}`}>
          🔬 Clinical Prognosis Guidance
          {sensitivityMode !== 'standard' && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[9px] tracking-wider">
              {sensitivityMode === 'high' ? 'HIGH-SENS MODE' : 'STRICT MODE'}
            </span>
          )}
        </h4>
        <p className="text-slate-100 font-semibold text-sm mb-1.5">{finalInsightTitle}</p>
        <p className="text-slate-400 text-[12px] leading-relaxed">{finalInsightText}</p>
      </div>

      {result._note && (
        <div className="p-3 bg-white/2 backdrop-blur-md border border-white/10 rounded-xl">
          <p className="text-slate-400 text-xs leading-relaxed italic text-center">{result._note}</p>
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
  patient_name?: string;
  patient_id?: string;
}

interface PatientTimelineProps {
  history: ScanHistoryItem[];
  patientName: string;
  patientId: string;
}

const PatientTimeline: React.FC<PatientTimelineProps> = ({ history, patientName, patientId }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(history.length / itemsPerPage);

  if (history.length === 0) return null;

  const oldestScan = history[history.length - 1];

  // 1. First, standardize the date string format to force local timezone parsing
  const standardizedOldestDate = oldestScan.scan_date.endsWith('Z') || oldestScan.scan_date.includes('+')
    ? oldestScan.scan_date
    : `${oldestScan.scan_date}Z`;

  // 2. Then, pass that standardized variable into the formatter
  const oldestDateTime = new Date(standardizedOldestDate).toLocaleString('en-US', {
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
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
    const standardizedDate = dateString.endsWith('Z') || dateString.includes('+')
      ? dateString
      : `${dateString}Z`;

    return new Date(standardizedDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const startIdx = currentPage * itemsPerPage;
  const pageItems = history.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="mt-8 p-6 bg-white/3 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.4)] animate-fadeIn">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-6 rounded-full bg-linear-to-b from-cyan-400 to-blue-600 shadow-[0_0_12px_rgba(56,189,248,0.7)]" />
        <h3 className="text-slate-100 font-semibold text-lg tracking-wide">Patient Diagnostic Timeline</h3>
      </div>

      <div className="mb-4 p-3 bg-cyan-500/5 backdrop-blur-md border border-cyan-400/20 rounded-xl">
        <p className="text-sm text-cyan-100/80 text-center">
          <span className="font-semibold text-cyan-200">Patient {oldestScan.patient_name || patientName}</span>’s first scan was performed on{' '}
          <span className="font-semibold text-white">{oldestDateTime}</span>
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl bg-white/2 backdrop-blur-md border border-white/10">
        <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
          <colgroup>
            <col style={{ width: '8%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>

          <thead>
            <tr className="bg-white/4 text-slate-300 text-[11px] uppercase font-bold tracking-[0.15em]" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th className="px-3 py-3 text-center" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>Sr. No</th>
              <th className="px-4 py-3 text-left" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>Patient Name</th>
              <th className="px-4 py-3 text-center" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>Patient ID</th>
              <th className="px-4 py-3 text-left" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>Date</th>
              <th className="px-4 py-3 text-left" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>Time</th>
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
                  className="transition-colors hover:bg-white/4 text-slate-200"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    backgroundColor: isLatest ? 'rgba(56, 189, 248, 0.06)' : 'transparent'
                  }}
                >
                  <td className="py-4 text-center font-medium text-slate-500" style={{ borderRight: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {startIdx + idx + 1}
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-100" style={{ borderRight: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {scan.patient_name || patientName}
                  </td>
                  <td className="py-4 px-4 text-slate-400 font-mono text-center" style={{ borderRight: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {scan.patient_id || patientId}
                  </td>
                  <td className="py-4 px-4 text-slate-300 text-left" style={{ borderRight: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatDate(scan.scan_date)}
                  </td>
                  <td className="py-4 px-4 text-slate-400 text-left" style={{ borderRight: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatTime(scan.scan_date)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md border ${
                        final === 'Normal' ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30' :
                        final.includes('Bacterial') ? 'bg-rose-400/10 text-rose-300 border-rose-400/30' :
                        'bg-amber-400/10 text-amber-300 border-amber-400/30'
                      }`}>
                        {final}
                      </span>
                      {isLatest && (
                        <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-linear-to-r from-cyan-400 to-blue-600 text-white rounded font-black shadow-[0_0_10px_rgba(56,189,248,0.6)] shrink-0">
                          Latest
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

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-white/10">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className={`px-4 py-2 text-sm font-medium rounded-lg backdrop-blur-md border transition-all ${
              currentPage === 0
                ? 'bg-white/2 border-white/5 text-slate-500 cursor-not-allowed'
                : 'bg-white/4 border-white/10 text-cyan-200 hover:bg-cyan-500/10 hover:border-cyan-400/40 hover:shadow-[0_0_15px_rgba(56,189,248,0.3)]'
            }`}
          >
            ← Previous
          </button>
          <span className="text-slate-400 text-sm tracking-wide">
            Page <span className="text-slate-100 font-semibold">{currentPage + 1}</span> of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            className={`px-4 py-2 text-sm font-medium rounded-lg backdrop-blur-md border transition-all ${
              currentPage >= totalPages - 1
                ? 'bg-white/2 border-white/5 text-slate-500 cursor-not-allowed'
                : 'bg-white/4 border-white/10 text-cyan-200 hover:bg-cyan-500/10 hover:border-cyan-400/40 hover:shadow-[0_0_15px_rgba(56,189,248,0.3)]'
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
    <div className="fixed inset-0 bg-[#0B132B]/80 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="bg-white/4 backdrop-blur-2xl rounded-2xl p-10 border border-white/10 shadow-[0_8px_60px_rgba(56,189,248,0.25)] flex flex-col items-center gap-6 animate-fadeIn">
        <div className="relative">
          <svg className="w-16 h-16 text-cyan-300 animate-pulse drop-shadow-[0_0_15px_rgba(56,189,248,0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 border-2 border-cyan-400/20 rounded-full animate-spin" />
          </div>
        </div>
        <p className="text-white text-xl font-semibold tracking-wide">Analyzing X-Ray...</p>
        <p className="text-slate-400 text-sm">AI is examining the image</p>
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 bg-cyan-300 rounded-full animate-bounce [animation-delay:0ms] shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <div className="w-2.5 h-2.5 bg-cyan-300 rounded-full animate-bounce [animation-delay:150ms] shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <div className="w-2.5 h-2.5 bg-cyan-300 rounded-full animate-bounce [animation-delay:300ms] shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
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

  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [sensitivityMode, setSensitivityMode] = useState<'standard' | 'high' | 'strict'>('standard');
  const [inferenceTime, setInferenceTime] = useState<number | null>(null);
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [patientDob, setPatientDob] = useState('');

  const resetAnalysisStates = () => {
    setPredictionResult(null);
    setViewMode('original');
    setOriginalImageBase64(null);
    setScanHistory([]); 
    setInferenceTime(null);
  };

  const [viewMode, setViewMode] = useState<'original' | 'heatmap'>('original');
  const [originalImageBase64, setOriginalImageBase64] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    resetAnalysisStates();

  }, [patientId]);

  const fetchPatientHistory = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/${id}`);
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

  // ── FEATURE 3: Quick-Sample Asset State Injector ──
  const injectSampleImage = async (filename: string, sampleName: string, sampleId: string,sampleGender: 'Male' | 'Female' | 'Other', sampleDob: string) => {
    resetAnalysisStates();
    setPatientName(sampleName);
    setPatientId(sampleId);
    setPatientGender(sampleGender); // NEW
    setPatientDob(sampleDob);
    setPredictionResult(null);
    setLoading(true);

    try {
      // Pulls the sample images directly from your public/ folder
      const response = await fetch(`/${filename}`);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'image/jpeg' });
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setOriginalImageBase64(reader.result as string);
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to inject sample radiographic file:", err);
    } finally {
      setLoading(false);
    }
  };

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
      formData.append('patient_gender', patientGender); // NEW
      formData.append('patient_dob', patientDob);

            // ── FEATURE 2: Start high-resolution timer ──
      const startTime = performance.now();

      const response = await fetch('${API_BASE_URL}/predict', {
        method: 'POST',
        body: formData,
      });

      // ── FEATURE 2: Stop timer & save latency ──
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);
      setInferenceTime(latencyMs);

      if (!response.ok) {

        const errData = await response.json();
        if (errData.detail) {
          setPredictionResult({ error: errData.detail });
          return;
        }
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      console.log("RAW BACKEND RESPONSE:", data);
      setPredictionResult(data);

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
      <main className="min-h-screen bg-[#0B132B] flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  const mobileDevice = isMobile;
  const desktopDevice = isDesktop;

  const hasValidPrediction =
    predictionResult &&
    !predictionResult.error &&
    !!predictionResult.prediction;

  const confidenceScores = hasValidPrediction
    ? {
        normal: predictionResult.Normal ?? 0,
        bacterial: predictionResult['Bacterial Pneumonia'] ?? 0,
        viral: predictionResult['Viral Pneumonia'] ?? 0,
      }
    : null;

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0B132B] text-slate-100">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 w-130 h-130 rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-140 h-140 rounded-full bg-blue-600/10 blur-[160px]" />
        <div className="absolute bottom-0 left-1/3 w-110 h-110 rounded-full bg-amber-400/6 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.4) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          }}
        />
      </div>

      {loading && <LoadingOverlay />}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/4 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[0_0_25px_rgba(56,189,248,0.25)]">
              <svg className="w-6 h-6 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Pneumonia <span className="bg-linear-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">Detection System</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1 tracking-wide">
                AI-Powered Radiographic Analysis · Clinical-Grade Diagnostic Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/3 backdrop-blur-xl border border-white/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs text-slate-300 tracking-wider uppercase">AI Engine Online</span>
          </div>
        </header>

        {/* Main grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* -------- LEFT COLUMN (5 cols) -------- */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Patient Credentials Card */}
            <section className="relative group">
              <div className="absolute -inset-px rounded-2xl bg-linear-to-br from-cyan-400/20 via-transparent to-amber-300/10 opacity-70 blur-[1px] pointer-events-none" />
              <div className="relative rounded-2xl bg-white/4 backdrop-blur-2xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.4)] p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                    <svg className="w-4 h-4 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-slate-100 font-semibold tracking-wide">Patient Credentials</h2>
                    <p className="text-[11px] text-slate-500 uppercase tracking-[0.2em]">Session Identity</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-[0.2em]">Patient Name</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => {
                        setPatientName(e.target.value);
                        resetAnalysisStates();
                      }}
                      placeholder="e.g., Suresh P"
                      className="w-full px-4 py-3 bg-white/3 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 focus:bg-white/6 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-[0.2em]">Patient ID</label>
                    <input
                      type="text"
                      value={patientId}
                      onChange={(e) => {
                        setPatientId(e.target.value);
                        resetAnalysisStates();
                      }}
                      placeholder="e.g., P12345"
                      className="w-full px-4 py-3 bg-white/3 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 focus:bg-white/6 transition-all"
                    />
                  </div>
                  {/* ── NEW FIELD: Patient Gender ── */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-[0.2em]">Gender</label>
                    <div className="relative">
                      <select
                        value={patientGender}
                        onChange={(e) => setPatientGender(e.target.value as any)}
                        className="w-full appearance-none px-4 py-3 pr-10 bg-white/3 backdrop-blur-md border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 focus:bg-white/6 transition-all cursor-pointer"
                      >
                        <option value="" className="bg-[#0B132B] text-slate-500">Select Gender</option>
                        <option value="Male" className="bg-[#0B132B] text-white">Male</option>
                        <option value="Female" className="bg-[#0B132B] text-white">Female</option>
                        <option value="Other" className="bg-[#0B132B] text-white">Other</option>
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-300/80 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* ── NEW FIELD: Date of Birth ── */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-[0.2em]">Date of Birth</label>
                    <input
                      type="date"
                      value={patientDob}
                      onChange={(e) => setPatientDob(e.target.value)}
                      className="w-full px-4 py-3 bg-white/3 backdrop-blur-md border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 focus:bg-white/6 transition-all scheme-dark"
                    />
                  </div>
                  {/* ── FEATURE 1: AI Sensitivity Selector ── */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-[0.2em]">
                      AI Sensitivity Level
                    </label>
                    <div className="relative">
                      <select
                        value={sensitivityMode}
                        onChange={(e) => setSensitivityMode(e.target.value as 'standard' | 'high' | 'strict')}
                        className="w-full appearance-none px-4 py-3 pr-10 bg-white/3 backdrop-blur-md border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 focus:bg-white/6 transition-all cursor-pointer"
                      >
                        <option value="standard" className="bg-[#0B132B] text-white">Standard Baseline (Default)</option>
                        <option value="high" className="bg-[#0B132B] text-white">High Sensitivity (ER Triage Mode)</option>
                        <option value="strict" className="bg-[#0B132B] text-white">Strict Specificity (Confirmations)</option>
                      </select>
                      {/* Custom chevron */}
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-300/80 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {sensitivityMode !== 'standard' && (
                      <p className="mt-1.5 text-[10px] text-cyan-300/70 tracking-wide">
                        {sensitivityMode === 'high'
                          ? '⚡ Threshold lowered — flags subtle infiltrates'
                          : '🛡 Threshold raised — confirms only high-confidence findings'}
                      </p>
                    )}
                  </div>

                </div>
              </div>
            </section>
                

            {/* Input Scanning Device / Upload Card */}
            <section className="relative group">
              <div className="absolute -inset-px rounded-2xl bg-linear-to-tr from-amber-300/10 via-transparent to-cyan-400/20 opacity-70 blur-[1px] pointer-events-none" />
              <div className="relative rounded-2xl bg-white/4 backdrop-blur-2xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.4)] p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-300/30 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.25)]">
                    <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-slate-100 font-semibold tracking-wide">Input Scanning Device</h2>
                    <p className="text-[11px] text-slate-500 uppercase tracking-[0.2em]">X-Ray Ingestion</p>
                  </div>
                </div>

                {mobileDevice ? (
                  <div className="w-full flex flex-col gap-3 items-center">
                    <p className="text-slate-400 text-center text-xs mb-1">Choose a method to upload the X-ray</p>

                    <button
                      onClick={() => setShowCamera(true)}
                      className="w-full px-4 py-3 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm shadow-[0_0_25px_rgba(56,189,248,0.35)] hover:shadow-[0_0_35px_rgba(56,189,248,0.55)] hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 border border-white/10"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Scan via Camera
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-3 rounded-xl bg-white/4 backdrop-blur-md border border-white/10 text-slate-200 font-medium text-sm hover:bg-white/8 hover:border-white/20 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Choose from Gallery
                    </button>

                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleGalleryChange} className="hidden" />
                  </div>
                ) : desktopDevice ? (
                  <div
                    {...getRootProps()}
                    className={`w-full min-h-45 rounded-xl border-2 border-dashed backdrop-blur-md flex flex-col items-center justify-center cursor-pointer transition-all p-6 ${
                      isDragActive
                        ? 'border-cyan-400/70 bg-cyan-400/6 shadow-[0_0_30px_rgba(56,189,248,0.35)]'
                        : 'border-white/15 bg-white/2 hover:border-cyan-400/40 hover:bg-white/4 hover:shadow-[0_0_25px_rgba(56,189,248,0.2)]'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="w-12 h-12 mb-3 rounded-xl bg-white/4 border border-white/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-slate-200 text-sm font-medium">
                      {isDragActive ? 'Drop the X-ray to ingest' : 'Drag & drop X-ray image'}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">or click to browse from your device</p>
                    <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] mt-4">DICOM · PNG · JPG</p>
                  </div>
                ) : (
                  <div className="text-slate-300 text-center">Device not supported</div>
                )}

                {/* ── PASTE THE NEW DATASET GALLERY COMPONENT DIRECTLY HERE: ── */}
                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 text-center">
                    🔬 Fast-Track Evaluation Datasets
                  </p>
                  {/* ── FEATURE 3: FAST-TRACK DATASETS ── */}
                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 text-center">
                    🔬 Fast-Track Evaluation Datasets
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => injectSampleImage('sample_normal.jpg', 'Normal Reference Case', 'REF-NORM', 'Other', '2026-01-01')}
                      className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      💡 Sample: Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => injectSampleImage('sample_pneumonia.jpg', 'Infection Reference Case', 'REF-PNEU', 'Other', '2026-01-01')}
                      className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
                    >
                      🚨 Sample: Pneumonia
                    </button>
                  </div>
                </div>
                </div>

                {selectedImage && (
                  <div className="mt-5 space-y-4">
                    <div className="p-3 rounded-xl bg-emerald-400/5 border border-emerald-400/25 backdrop-blur-md">
                      <p className="text-emerald-300 text-center text-sm">
                        ✓ Ready: <span className="text-slate-200 font-medium">{selectedImage.name}</span>
                      </p>
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={loading || !patientName || !patientId}
                      className={`w-full py-3 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 border ${
                        loading || !patientName || !patientId
                          ? 'bg-white/3 border-white/5 text-slate-500 cursor-not-allowed'
                          : 'bg-linear-to-r from-cyan-500 via-sky-500 to-blue-600 border-white/10 text-white shadow-[0_0_30px_rgba(56,189,248,0.45)] hover:shadow-[0_0_45px_rgba(56,189,248,0.7)] hover:from-cyan-400 hover:to-blue-500'
                      }`}
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
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* -------- RIGHT COLUMN (7 cols) -------- */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <section className="relative flex-1">
              <div className="absolute -inset-px rounded-2xl bg-linear-to-br from-cyan-400/20 via-transparent to-amber-300/15 opacity-70 blur-[1px] pointer-events-none" />
              <div className="relative rounded-2xl bg-white/3 backdrop-blur-2xl border border-white/10 shadow-[0_8px_50px_rgba(0,0,0,0.5)] p-6 lg:p-8 min-h-130">
                <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-cyan-400/20 to-amber-300/10 border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                      <svg className="w-4 h-4 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-slate-100 font-semibold tracking-wide">Diagnostic Output</h2>
                      <p className="text-[11px] text-slate-500 uppercase tracking-[0.2em]">Real-Time Inference Console</p>
                    </div>
                  </div>

                  {hasValidPrediction && (
                    <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 rounded-full px-3 py-1 backdrop-blur-md">
                      ● Analysis Complete
                    </span>
                  )}
                </div>

                {/* Image Viewer with Original/Heatmap Toggle + Scan Line + Corner Brackets (EDIT A) */}
                {predictionResult && predictionResult.heatmap_url && originalImageBase64 && (
                  <div className="rounded-2xl bg-white/2 backdrop-blur-md border border-white/10 p-5 mb-6 animate-fadeIn">
                    <div className="flex justify-center gap-2 mb-4">
                      <button
                        onClick={() => setViewMode('original')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg backdrop-blur-md border transition-all ${
                          viewMode === 'original'
                            ? 'bg-linear-to-r from-cyan-500 to-blue-600 border-white/10 text-white shadow-[0_0_20px_rgba(56,189,248,0.5)]'
                            : 'bg-white/4 border-white/10 text-slate-300 hover:bg-white/8 hover:border-white/20'
                        }`}
                      >
                        Original Image
                      </button>
                      <button
                        onClick={() => setViewMode('heatmap')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg backdrop-blur-md border transition-all ${
                          viewMode === 'heatmap'
                            ? 'bg-linear-to-r from-amber-400 to-amber-600 border-white/10 text-slate-900 shadow-[0_0_20px_rgba(251,191,36,0.55)] font-semibold'
                            : 'bg-white/4 border-white/10 text-slate-300 hover:bg-white/8 hover:border-white/20'
                        }`}
                      >
                        AI Heatmap (Grad-CAM)
                      </button>
                    </div>

                    <div className="flex w-full justify-center">
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-xl bg-linear-to-r from-cyan-400/30 via-blue-500/20 to-amber-300/20 opacity-60 blur-lg" />
                        <div className="relative rounded-xl border border-white/15 bg-black shadow-[0_0_40px_rgba(0,0,0,0.6)] overflow-hidden">
                          <img
                            src={
                              viewMode === 'original'
                                ? originalImageBase64
                                : predictionResult.heatmap_url?.startsWith('http')
                                  ? predictionResult.heatmap_url
                                  : `${API_BASE_URL}${predictionResult.heatmap_url}`
                            }
                            alt={viewMode === 'original' ? 'Original X-Ray' : 'AI Heatmap'}
                            style={{
                              width: 'auto',
                              maxWidth: '360px',
                              maxHeight: '360px',
                              objectFit: 'contain',
                              display: 'block'
                            }}
                          />
                          {/* Diagnostic scan line sweeping across the image */}
                          <div className="scan-line" />
                          {/* Corner viewfinder brackets */}
                          <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-cyan-300/70" />
                          <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-cyan-300/70" />
                          <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-cyan-300/70" />
                          <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-cyan-300/70" />
                        </div>
                      </div>
                    </div>

                    {viewMode === 'heatmap' && (
                      <div className="mt-4 mx-auto max-w-md px-4 py-2.5 bg-cyan-500/5 border border-cyan-400/25 rounded-lg backdrop-blur-md">
                        <p className="text-[11px] text-cyan-100/80 text-center leading-relaxed m-0">
                          <span className="font-semibold">🔬 AI Focus Analysis:</span>{' '}
                          <span className="text-rose-300 font-medium">Red/Orange</span> regions indicate high diagnostic focus.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Results / Empty state with scan line (EDIT B) */}
                {predictionResult && !loading ? (
                   <ResultsCard result={predictionResult} sensitivityMode={sensitivityMode} inferenceTime={inferenceTime} />
                ) : !loading ? (
                  <div className="relative overflow-hidden flex flex-col items-center justify-center text-center py-16 px-6">
                    {/* Subtle idle scan line */}
                    <div className="scan-line scan-line-slow" />

                    <div className="relative mb-6">
                      <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-2xl" />
                      <div className="relative w-24 h-24 rounded-full bg-white/3 border border-white/10 backdrop-blur-md flex items-center justify-center shadow-[0_0_35px_rgba(56,189,248,0.2)]">
                        <svg className="w-10 h-10 text-cyan-300/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-slate-200 font-semibold text-lg tracking-wide mb-2">Awaiting Radiographic Input</h3>
                    <p className="text-slate-500 text-sm max-w-md leading-relaxed">
                      Enter patient credentials and upload an X-ray on the left panel. The AI heatmap, diagnostic reading and confidence breakdown will appear here.
                    </p>

                    <div className="mt-8 grid grid-cols-3 gap-3 max-w-md w-full">
                      {['Heatmap', 'Confidence', 'Report'].map((k) => (
                        <div key={k} className="rounded-lg bg-white/2 border border-white/5 backdrop-blur-md py-3 px-2 text-center">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{k}</p>
                          <p className="text-slate-600 text-xs mt-1">— —</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Premium Download Report Button (Gold) */}
                {hasValidPrediction && !loading && confidenceScores && (
                  <div className="mt-6 w-full">
                    <div className="relative rounded-xl overflow-hidden">
                      <div className="absolute -inset-px rounded-xl bg-linear-to-r from-amber-300 via-yellow-500 to-amber-600 opacity-70 blur-[6px]" />
                      <div className="relative rounded-xl bg-linear-to-r from-amber-400 via-yellow-500 to-amber-600 p-px shadow-[0_0_30px_rgba(251,191,36,0.45)]">
                        <div className="rounded-[10px] bg-[#0B132B]/40 backdrop-blur-md">
                          <DynamicDownloadButton
                            patientName={patientName}
                            patientId={patientId}
                            patientGender={predictionResult?.patient_gender || predictionResult?.patientGender || patientGender}
                            patientDob={predictionResult?.patient_dob || predictionResult?.patientDob || patientDob}
                            diagnosis={predictionResult.prediction || 'Unknown'}
                            confidenceScores={confidenceScores}
                            date={new Date().toLocaleString()}
                            originalImageURL={originalImageBase64  ?? undefined}
                            heatmapURL={predictionResult.heatmap_url?.startsWith('http')
                              ? predictionResult.heatmap_url
                              : `${API_BASE_URL}${predictionResult.heatmap_url}`}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-center text-[10px] uppercase tracking-[0.3em] text-amber-300/70">
                      Premium Clinical Report · PDF
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Camera modal */}
            {showCamera && <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />}

            {/* Patient Timeline */}
            {scanHistory.length > 0 && (
              <PatientTimeline history={scanHistory} patientName={patientName} patientId={patientId} />
            )}
          </div>
        </div>

        {/* Footer with High-End Medical Disclaimer */}
        <footer className="mt-14 pb-8 flex flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-center gap-3 w-full">
            <div className="h-px w-24 bg-linear-to-r from-transparent to-cyan-400/40" />
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500 font-medium">
              Clinical Diagnostic Console · v1.0
            </p>
            <div className="h-px w-24 bg-linear-to-l from-transparent to-amber-300/40" />
          </div>

          {/* New Disclaimer Block */}
          <div className="max-w-4xl mx-auto px-6 py-4 mt-2 rounded-xl bg-slate-950/40 border border-white/5 backdrop-blur-md text-center">
            <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1.5">
              <span>⚠️</span> Legal & Clinical Demonstration Disclaimer
            </p>
            <p className="text-[15px] text-slate-white leading-relaxed font-normal max-w-3xl mx-auto">
              This system is an AI-assisted screening prototype developed exclusively for evaluation and hackathon demonstration purposes. 
              The multi-class predictive scores, automated threshold alterations, and Grad-CAM focus metrics generated by this console 
              are intended to support investigative clinical triage workflows and do not constitute a definitive medical diagnosis. 
              All diagnostic outputs must be strictly reviewed, cross-referenced, and authenticated by a licensed radiologist or 
              certified healthcare practitioner prior to any clinical intervention.
            </p>
          </div>
        </footer>
        </div>
    </main>
  );
}