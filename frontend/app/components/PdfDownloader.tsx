'use client';

import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import MedicalReportPDF from './MedicalReport'; 

interface ConfidenceScores {
  normal?: number;
  bacterial?: number;
  viral?: number;
  'Bacterial Pneumonia'?: number;
  'Viral Pneumonia'?: number;
  Normal?: number;
}
interface DownloadReportButtonProps {
  patientName: string;
  patientId: string;
  patientGender: string; // Add this line
  patientDob: string;
  diagnosis: string;
  confidenceScores: ConfidenceScores;
  date: string;
  fileName?: string;
  originalImageURL?: string;   
  heatmapURL?: string;
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
  patientName,
  patientId,
  patientGender,
  patientDob,
  diagnosis,
  confidenceScores,
  date,
  fileName,
  originalImageURL,   
  heatmapURL,
}) => {
  const generatedFileName =
    fileName || `Medical-Report-${patientId}-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <MedicalReportPDF
          patientName={patientName}
          patientId={patientId}
          patientGender={patientGender}
          patientDob={patientDob}
          diagnosis={diagnosis}
          confidenceScores={confidenceScores}
          date={date}
          originalImageURL={originalImageURL}   
          heatmapURL={heatmapURL}
        />
      }
      fileName={generatedFileName}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '220px', // Forces button width
        height: '44px',  // Forces button height
        padding: '10px 16px',
        backgroundColor: '#2563eb',
        color: '#ffffff',
        borderRadius: '12px',
        fontWeight: '500',
        fontSize: '14px',
        textDecoration: 'none',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        margin: '0 auto'
      }}
    >
      {({ loading: pdfLoading, error }) =>
        pdfLoading ? (
          'Generating PDF...'
        ) : error ? (
          'Error creating PDF'
        ) : (
          <>
            {/* Hardcoded explicitly sized dimensions on the SVG icon */}
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span style={{ whiteSpace: 'nowrap' }}>Download Report</span>
          </>
        )
      }
    </PDFDownloadLink>
  );
};