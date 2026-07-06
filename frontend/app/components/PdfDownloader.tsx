'use client';

import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import MedicalReportPDF from './MedicalReport'; // Import the PDF document template

// Re-define props here for this self-contained component
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
  diagnosis: string;
  confidenceScores: ConfidenceScores;
  date: string;
  fileName?: string;
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
  patientName,
  patientId,
  diagnosis,
  confidenceScores,
  date,
  fileName,
}) => {
  const generatedFileName =
    fileName || `Medical-Report-${patientId}-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <MedicalReportPDF
          patientName={patientName}
          patientId={patientId}
          diagnosis={diagnosis}
          confidenceScores={confidenceScores}
          date={date}
        />
      }
      fileName={generatedFileName}
      className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium transition-colors shadow-lg text-center"
    >
      {({ loading: pdfLoading, error }) =>
        pdfLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating PDF...
          </>
        ) : error ? (
          'Error creating PDF'
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Official PDF Report
          </>
        )
      }
    </PDFDownloadLink>
  );
};