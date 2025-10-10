/**
 * Clothing Detection Modal Component
 * 
 * This component provides AI-powered clothing detection and validation
 * for uploaded images. It shows detection results, suggestions, and
 * allows users to confirm or correct the AI's analysis.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { ClothingCategory } from '@/lib/types/common';
import { ClothingDetectionUtils } from '@/lib/ai/clothingDetection';

// Detection result interface
interface DetectionResult {
  detection: {
    success: boolean;
    confidence: number;
    detectedCategory: ClothingCategory | null;
    suggestedCategory: ClothingCategory | null;
    qualityScore: number;
    detectedAttributes: {
      color?: string;
      style?: string;
      pattern?: string;
      material?: string;
    };
    suggestions: string[];
    warnings: string[];
  };
  quality: {
    isClothing: boolean;
    clothingType: string;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
    recommendations: string[];
  };
}

// Component props
interface ClothingDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: DetectionResult) => void;
  imageUrl: string;
  userCategory: ClothingCategory;
  className?: string;
}

/**
 * Main clothing detection modal component
 */
export function ClothingDetectionModal({
  isOpen,
  onClose,
  onConfirm,
  imageUrl,
  userCategory,
  className = '',
}: ClothingDetectionModalProps) {
  // State management
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  
  // Load detection results when modal opens
  useEffect(() => {
    if (isOpen && imageUrl) {
      loadDetectionResults();
    }
  }, [isOpen, imageUrl]);
  
  /**
   * Load AI detection results
   */
  const loadDetectionResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/ai/clothing-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          category: userCategory,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setDetectionResult(result.data);
      } else {
        throw new Error(result.error || 'Detection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle confirmation of detection results
   */
  const handleConfirm = () => {
    if (detectionResult) {
      setConfirmed(true);
      onConfirm(detectionResult);
    }
  };
  
  /**
   * Handle rejection of detection results
   */
  const handleReject = () => {
    onClose();
  };
  
  /**
   * Get confidence color for display
   */
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  /**
   * Get quality color for display
   */
  const getQualityColor = (quality: string): string => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className={className}>
      <ModalHeader>
        <h2 className="text-xl font-semibold">AI Clothing Detection</h2>
        <p className="text-sm text-gray-600">
          Our AI has analyzed your image and provided suggestions
        </p>
      </ModalHeader>
      
      <ModalContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-3">Analyzing your image...</span>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <strong>Detection Failed</strong>
            <p>{error}</p>
            <Button onClick={loadDetectionResults} className="mt-2" size="sm">
              Try Again
            </Button>
          </Alert>
        )}
        
        {detectionResult && !loading && (
          <div className="space-y-6">
            {/* Detection Results */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Detection Results</h3>
              
              {/* Confidence and Quality */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-600">Confidence</h4>
                  <p className={`text-2xl font-bold ${getConfidenceColor(detectionResult.detection.confidence)}`}>
                    {detectionResult.detection.confidence}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {ClothingDetectionUtils.formatConfidence(detectionResult.detection.confidence)}
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-600">Quality</h4>
                  <p className={`text-2xl font-bold ${getQualityColor(detectionResult.quality.quality)}`}>
                    {detectionResult.quality.quality}
                  </p>
                  <p className="text-xs text-gray-500">
                    {ClothingDetectionUtils.formatQuality(detectionResult.detection.qualityScore)}
                  </p>
                </div>
              </div>
              
              {/* Category Detection */}
              {detectionResult.detection.suggestedCategory && (
                <Alert>
                  <strong>Category Suggestion</strong>
                  <p>
                    AI suggests this might be{' '}
                    <span className="font-medium">
                      {ClothingDetectionUtils.getCategoryDisplayName(detectionResult.detection.suggestedCategory)}
                    </span>{' '}
                    instead of{' '}
                    <span className="font-medium">
                      {ClothingDetectionUtils.getCategoryDisplayName(userCategory)}
                    </span>
                    .
                  </p>
                </Alert>
              )}
              
              {/* Detected Attributes */}
              {Object.keys(detectionResult.detection.detectedAttributes).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Detected Attributes</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(detectionResult.detection.detectedAttributes).map(([key, value]) => (
                      <div key={key} className="p-2 bg-blue-50 rounded text-sm">
                        <span className="font-medium capitalize">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Suggestions */}
              {detectionResult.detection.suggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Styling Suggestions</h4>
                  <ul className="space-y-1">
                    {detectionResult.detection.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Warnings */}
              {detectionResult.detection.warnings.length > 0 && (
                <Alert variant="destructive">
                  <strong>Issues Detected</strong>
                  <ul className="mt-2 space-y-1">
                    {detectionResult.detection.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">• {warning}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              
              {/* Quality Issues */}
              {detectionResult.quality.issues.length > 0 && (
                <Alert>
                  <strong>Image Quality Issues</strong>
                  <ul className="mt-2 space-y-1">
                    {detectionResult.quality.issues.map((issue, index) => (
                      <li key={index} className="text-sm">• {issue}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              
              {/* Recommendations */}
              {detectionResult.quality.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Recommendations</h4>
                  <ul className="space-y-1">
                    {detectionResult.quality.recommendations.map((recommendation, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalContent>
      
      <ModalFooter>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleReject}>
            Cancel
          </Button>
          
          {detectionResult && (
            <Button
              onClick={handleConfirm}
              disabled={loading || confirmed}
              className={confirmed ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {confirmed ? 'Confirmed' : 'Continue with Upload'}
            </Button>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
}

export default ClothingDetectionModal;
