'use client';

import React, { useState, useEffect } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer';

// ==========================================
// 1. PDF Template Styles (Corporate Medical)
// ==========================================
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1f2937',
  },
  // Navy Header
  headerBand: {
    backgroundColor: '#0f172a', // Navy 900
    padding: 20,
    marginLeft: -40,
    marginRight: -40,
    marginTop: -40,
    marginBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#94a3b8', // Slate 400
    fontSize: 9,
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    color: '#38bdf8', // Sky 400
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },

  // Section Layouts
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb', // Blue 600
    marginBottom: 10,
  },

  // Patient Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    
  },
  gridCell: {
    width: '46%',
    marginBottom: 8,
    marginRight: '4%',
  },
  gridLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    fontFamily: 'Helvetica-Bold',
  },
  gridValue: {
    fontSize: 11,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
  },

  // Diagnostic Summary
  diagnosisBox: {
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 20,
  },
  diagnosisBoxNormal: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  diagnosisBoxInfection: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  diagnosisLabel: {
    fontSize: 9,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  diagnosisValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
  },
  diagnosisValueNormal: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
  },

  // Confidence Matrix
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  matrixLabel: {
    fontSize: 10,
    color: '#334155',
    fontFamily: 'Helvetica-Bold',
  },
  matrixBarContainer: {
    width: 120,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
  
  },
  matrixBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  matrixValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    width: 45,
    textAlign: 'right',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },

  // Disclaimer
  disclaimer: {
    marginTop: 30,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#94a3b8',
  },
  disclaimerText: {
    fontSize: 8,
    color: '#64748b',
    lineHeight: 1.4,
    fontStyle: 'italic',
  },
});

// ==========================================
// 2. Props & Interfaces
// ==========================================
interface ConfidenceScores {
  normal?: number;
  bacterial?: number;
  viral?: number;
  'Bacterial Pneumonia'?: number;
  'Viral Pneumonia'?: number;
  Normal?: number;
}

interface MedicalReportPDFProps {
  patientName: string;
  patientId: string;
  diagnosis: string;
  confidenceScores: ConfidenceScores;
  date: string;
}



// ==========================================
// 3. PDF Document Component
// ==========================================
const MedicalReportPDF: React.FC<MedicalReportPDFProps> = ({
  patientName,
  patientId,
  diagnosis,
  confidenceScores,
  date,
}) => {
  const isNormal = diagnosis === 'Normal';

  // Normalise scores from any key format
  const normalVal = confidenceScores?.normal ?? confidenceScores?.Normal ?? 0;
  const bacterialVal = confidenceScores?.bacterial ?? confidenceScores?.['Bacterial Pneumonia'] ?? 0;
  const viralVal = confidenceScores?.viral ?? confidenceScores?.['Viral Pneumonia'] ?? 0;

  const formatPct = (n: number) => `${(n || 0).toFixed(1)}%`;

  const getBarColor = (label: string) => {
    if (label.includes('Normal')) return '#10b981';
    if (label.includes('Bacterial')) return '#ef4444';
    return '#f97316';
  };

  return (
    <Document title={`Medical Report - ${patientId}`} author="AI Diagnostic System">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBand}>
          <View>
            <Text style={styles.headerTitle}>AI-Assisted Pulmonary Diagnostic Report</Text>
            <Text style={styles.headerSubtitle}>Corporate Medical Intelligence Division</Text>
          </View>
          <Text style={styles.headerBadge}>Confidential</Text>
        </View>

        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.grid}>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Patient Name</Text>
              <Text style={styles.gridValue}>{patientName || 'N/A'}</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Patient ID</Text>
              <Text style={styles.gridValue}>{patientId || 'N/A'}</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Scan Date</Text>
              <Text style={styles.gridValue}>{date}</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Report ID</Text>
              <Text style={styles.gridValue}>{`RPT-${Date.now().toString(36).toUpperCase()}`}</Text>
            </View>
          </View>
        </View>

        {/* Diagnosis Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnostic Summary</Text>
          <View style={[styles.diagnosisBox, isNormal ? styles.diagnosisBoxNormal : styles.diagnosisBoxInfection]}>
            <Text style={styles.diagnosisLabel}>Primary AI Prediction</Text>
            <Text style={isNormal ? styles.diagnosisValueNormal : styles.diagnosisValue}>
              {diagnosis}
            </Text>
            <Text style={{ fontSize: 9, color: '#64748b', marginTop: 6 }}>
              Generated via convolutional neural network classification on chest radiograph.
            </Text>
          </View>
        </View>

        {/* Confidence Matrix */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confidence Breakdown Matrix</Text>

          {[
            { label: 'Normal', value: normalVal, color: '#10b981' },
            { label: 'Bacterial Pneumonia', value: bacterialVal, color: '#ef4444' },
            { label: 'Viral Pneumonia', value: viralVal, color: '#f97316' },
          ].map((item) => (
            <View key={item.label} style={styles.matrixRow}>
              <Text style={styles.matrixLabel}>{item.label}</Text>
              <View style={styles.matrixBarContainer}>
                <View
                  style={[
                    styles.matrixBarFill,
                    {
                      width: `${Math.min(item.value, 100)}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.matrixValue}>{formatPct(item.value)}</Text>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This report is generated by an artificial intelligence model for assistive diagnostic purposes only.
            It does not constitute a definitive medical diagnosis. A board-certified radiologist or pulmonologist
            should review all imaging studies before finalizing clinical decisions.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AI Pulmonary Diagnostics © {new Date().getFullYear()}</Text>
          <Text style={styles.footerText}>Page 1 of 1 | {patientId}</Text>
        </View>
      </Page>
    </Document>
  );
};

// ==========================================
// 4. Wrapper / Download Button Component
// ==========================================

export default MedicalReportPDF;