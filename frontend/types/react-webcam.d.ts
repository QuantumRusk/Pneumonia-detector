declare module 'react-webcam' {
  import * as React from 'react';

  export interface WebcamProps {
    audio?: boolean;
    audioConstraints?: MediaTrackConstraints | boolean;
    forceScreenshotSourceSize?: boolean;
    imageSmoothing?: boolean;
    mirrored?: boolean;
    minScreenshotHeight?: number;
    minScreenshotWidth?: number;
    onUserMedia?: (stream: MediaStream) => void;
    onUserMediaError?: (error: string | DOMException) => void;
    screenshotFormat?: 'image/webp' | 'image/png' | 'image/jpeg';
    screenshotQuality?: number;
    style?: React.CSSProperties;
    className?: string;
    videoConstraints?: MediaTrackConstraints;
    children?: React.ReactNode;
  }

  export default class Webcam extends React.Component<WebcamProps> {
    getScreenshot(): string | null;
    getCanvas(): HTMLCanvasElement | null;
    video: HTMLVideoElement | null;
  }
}