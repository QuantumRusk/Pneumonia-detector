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
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      {/* Centered Modal Card - Changed max-w-[550px] to max-w-xl */}
      <div className="w-full max-w-xl bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <h2 className="text-white text-lg font-semibold">
            {capturedImage ? 'Preview Capture' : 'Align & Capture'}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Unified Camera / Preview Frame (Strict 16:9 Aspect Ratio Container - Changed aspect-[16/9] to aspect-video) */}
        <div className="relative w-full aspect-video bg-black overflow-hidden">
          {!capturedImage ? (
            <>
              {/* Webcam viewport - Absolute Cover */}
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
                      fill="rgba(0,0,0,0.4)"
                      mask="url(#chestCutout)"
                    />

                    {/* Centered dashed blue align guide matching the mask */}
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
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeDasharray="8,4"
                    />

                    {/* Guide text */}
                    <text
                      x="320"
                      y="335"
                      textAnchor="middle"
                      fill="#3b82f6"
                      fontSize="14"
                      fontWeight="600"
                    >
                      Align X-ray film within the outline
                    </text>
                  </svg>
                </div>
              )}
            </>
          ) : (
            /* Static Image Preview */
            <img
              src={capturedImage}
              alt="Captured X-Ray"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-800">
          {!capturedImage ? (
            <button
              onClick={capture}
              disabled={!isCameraReady}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white 
                         rounded-xl hover:bg-blue-700 transition-colors 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         font-medium text-base shadow-lg"
            >
              <Camera className="w-5 h-5" />
              Capture Photo
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={handleUpload}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-green-600 
                           text-white rounded-xl hover:bg-green-700 transition-colors 
                           font-medium text-base shadow-lg"
              >
                <Check className="w-5 h-5" />
                Use Photo
              </button>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-purple-600 
                           text-white rounded-xl hover:bg-purple-700 transition-colors 
                           font-medium text-base shadow-lg
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Brain className="w-5 h-5" />
                {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
              </button>

              <button
                onClick={handleRetake}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-600 
                           text-white rounded-xl hover:bg-gray-700 transition-colors 
                           font-medium text-base
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-5 h-5" />
                Retake Photo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;