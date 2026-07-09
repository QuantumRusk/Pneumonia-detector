'use client';

import React, { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';
import { Camera, Check, X, RefreshCw, Brain } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageFile: File) => void;
  onClose?: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const videoConstraints: MediaTrackConstraints = {
    width: 1280,
    height: 720,
    facingMode: 'environment',
  };

  const handleUserMedia = useCallback(() => {
    setIsCameraReady(true);
  }, []);

  const capture = useCallback((): void => {
    if (webcamRef.current) {
      const imageSrc: string | null = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedImage(imageSrc);
        const byteString: string = atob(imageSrc.split(',')[1]);
        const mimeString: string = imageSrc.split(',')[0].split(':')[1].split(';')[0];
        const ab: ArrayBuffer = new ArrayBuffer(byteString.length);
        const ia: Uint8Array = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const file = new File([ab], `xray-capture-${Date.now()}.png`, {
          type: mimeString,
        });
        setCapturedFile(file);
      }
    }
  }, []);

  const handleUpload = useCallback((): void => {
    if (capturedFile) {
      onCapture(capturedFile);
    }
  }, [capturedFile, onCapture]);

  const handleRetake = useCallback((): void => {
    setCapturedImage(null);
    setCapturedFile(null);
  }, []);

  const handleAnalyze = useCallback(async (): Promise<void> => {
    if (!capturedFile) return;
    setIsAnalyzing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log('Analysis complete — backend call goes here');
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [capturedFile]);

  return (
    <div className="fixed inset-0 bg-[#0B132B]/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-fadeIn">
      {/* Ambient glow behind modal */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-100 h-100 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-100 h-100 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Centered Glass Modal Card */}
      <div className="relative w-full max-w-xl">
        {/* Outer luminous halo */}
        <div className="absolute -inset-px rounded-2xl bg-linear-to-br from-cyan-400/30 via-transparent to-amber-300/15 opacity-70 blur-[2px] pointer-events-none" />

        <div className="relative bg-white/[0.04\\] backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.6),0_0_40px_rgba(56,189,248,0.15)]">

          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-white/10 bg-white/200 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                <Camera className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-white text-base font-semibold tracking-wide">
                  {capturedImage ? 'Preview Capture' : 'Align & Capture'}
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.25em]">
                  {capturedImage ? 'Confirm Radiograph' : 'Live Radiographic Feed'}
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/3 border border-white/10 text-slate-400 hover:text-white hover:bg-white/8 hover:border-white/20 transition-all flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Unified Camera / Preview Frame (Strict 16:9 Aspect Ratio Container) */}
          <div className="relative w-full aspect-video bg-black overflow-hidden">
            {!capturedImage ? (
              <>
                {/* Webcam viewport - Absolute Cover (untouched props) */}
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/png"
                  videoConstraints={videoConstraints}
                  onUserMedia={handleUserMedia}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />

                {/* True Double-Layer Overlay (Positioned Lock-and-Key with Video) */}
                {isCameraReady && (
                  <div className="absolute inset-0 z-10 pointer-events-none w-full h-full">
                    <svg
                      viewBox="0 0 640 360"
                      className="w-full h-full"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <mask id="chestCutout">
                          {/* White block: Makes outside parts dark */}
                          <rect x="0" y="0" width="640" height="360" fill="white" />
                          {/* Centered chest path cutout mask */}
                          <path
                            d="M 240 60
                               C 270 40, 310 40, 320 60
                               C 330 40, 370 40, 400 60
                               C 430 80, 440 110, 440 150
                               C 440 210, 400 270, 370 290
                               C 340 310, 300 310, 270 290
                               C 240 270, 200 210, 200 150
                               C 200 110, 210 80, 240 60 Z"
                            fill="black"
                          />
                        </mask>
                      </defs>

                      {/* Masked transparent grey window */}
                      <rect
                        x="0"
                        y="0"
                        width="640"
                        height="360"
                        fill="rgba(0,0,0,0.5)"
                        mask="url(#chestCutout)"
                      />

                      {/* Centered dashed cyan align guide matching the mask */}
                      <path
                        d="M 240 60
                           C 270 40, 310 40, 320 60
                           C 330 40, 370 40, 400 60
                           C 430 80, 440 110, 440 150
                           C 440 210, 400 270, 370 290
                           C 340 310, 300 310, 270 290
                           C 240 270, 200 210, 200 150
                           C 200 110, 210 80, 240 60 Z"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="3"
                        strokeDasharray="8,4"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.7))' }}
                      />

                      {/* Guide text */}
                      <text
                        x="320"
                        y="335"
                        textAnchor="middle"
                        fill="#7dd3fc"
                        fontSize="13"
                        fontWeight="600"
                        letterSpacing="1.5"
                        style={{ filter: 'drop-shadow(0 0 4px rgba(56,189,248,0.6))' }}
                      >
                        ALIGN X-RAY FILM WITHIN THE OUTLINE
                      </text>
                    </svg>

                    {/* Diagnostic scan line sweeping across the live feed */}
                    <div className="scan-line" />

                    {/* Corner viewfinder brackets */}
                    <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-300/80" />
                    <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-300/80" />
                    <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-300/80" />
                    <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-300/80" />

                    {/* REC-style status pill top-left */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-cyan-400/30 backdrop-blur-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse shadow-[0_0_6px_rgba(56,189,248,0.9)]" />
                      <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-100">Live Feed</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Static Image Preview */
              <>
                <img
                  src={capturedImage}
                  alt="Captured X-Ray"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="scan-line scan-line-slow" />
                  <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-300/80" />
                  <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-300/80" />
                  <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-300/80" />
                  <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-300/80" />
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/50 border border-amber-300/30 backdrop-blur-md">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-amber-200">Preview · Frozen Frame</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="p-5 border-t border-white/10 bg-white/200 backdrop-blur-md">
            {!capturedImage ? (
              <button
                onClick={capture}
                disabled={!isCameraReady}
                className={`flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl font-semibold text-base transition-all border ${
                  !isCameraReady
                    ? 'bg-white/3 border-white/5 text-slate-500 cursor-not-allowed'
                    : 'bg-linear-to-r from-cyan-500 via-sky-500 to-blue-600 border-white/10 text-white shadow-[0_0_30px_rgba(56,189,248,0.45)] hover:shadow-[0_0_45px_rgba(56,189,248,0.7)] hover:from-cyan-400 hover:to-blue-500'
                }`}
              >
                <Camera className="w-5 h-5" />
                Capture Photo
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleUpload}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl font-semibold text-base transition-all border bg-linear-to-r from-emerald-500 to-emerald-600 border-white/10 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] hover:from-emerald-400 hover:to-emerald-500"
                >
                  <Check className="w-5 h-5" />
                  Use Photo
                </button>

                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className={`flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl font-semibold text-base transition-all border ${
                    isAnalyzing
                      ? 'bg-white/3 border-white/5 text-slate-500 cursor-not-allowed'
                      : 'bg-linear-to-r from-cyan-500 via-sky-500 to-blue-600 border-white/10 text-white shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:shadow-[0_0_35px_rgba(56,189,248,0.6)] hover:from-cyan-400 hover:to-blue-500'
                  }`}
                >
                  <Brain className="w-5 h-5" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                </button>

                <button
                  onClick={handleRetake}
                  disabled={isAnalyzing}
                  className={`flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl font-medium text-base transition-all border ${
                    isAnalyzing
                      ? 'bg-white/3 border-white/5 text-slate-500 cursor-not-allowed'
                      : 'bg-white/4 backdrop-blur-md border-white/10 text-slate-200 hover:bg-white/8 hover:border-white/20'
                  }`}
                >
                  <RefreshCw className="w-5 h-5" />
                  Retake Photo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;