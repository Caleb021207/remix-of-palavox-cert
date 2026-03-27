import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CertificationCodeVerification {
  isValid: boolean;
  usageCount: number;
  maxUsage: number;
  schoolId?: string;
  studentId?: string;
  error?: string;
}

export const useCertificationCode = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [verificationResult, setVerificationResult] = useState<CertificationCodeVerification | null>(null);

  const verifyCode = async (code: string): Promise<CertificationCodeVerification> => {
    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-certification-code', {
        body: { code }
      });

      if (error) {
        console.error('Error verifying certification code:', error);
        const result = { 
          isValid: false, 
          error: 'Failed to verify code', 
          usageCount: 0, 
          maxUsage: 3 
        };
        setVerificationResult(result);
        return result;
      }

      setVerificationResult(data);
      return data;
    } catch (error) {
      console.error('Network error verifying certification code:', error);
      const result = { 
        isValid: false, 
        error: 'Network error', 
        usageCount: 0, 
        maxUsage: 3 
      };
      setVerificationResult(result);
      return result;
    } finally {
      setIsVerifying(false);
    }
  };

  const trackUsage = async (code: string, testSessionId: string): Promise<boolean> => {
    setIsTracking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('track-certification-usage', {
        body: { code, testSessionId }
      });

      if (error) {
        console.error('Error tracking certification code usage:', error);
        return false;
      }

      return data.success;
    } catch (error) {
      console.error('Network error tracking certification code usage:', error);
      return false;
    } finally {
      setIsTracking(false);
    }
  };

  const clearVerification = () => {
    setVerificationResult(null);
  };

  return {
    verifyCode,
    trackUsage,
    clearVerification,
    isVerifying,
    isTracking,
    verificationResult
  };
};