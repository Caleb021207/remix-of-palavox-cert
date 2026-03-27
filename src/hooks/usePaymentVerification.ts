
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Debounce utility
function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const newTimeoutId = setTimeout(() => func(...args), delay);
    setTimeoutId(newTimeoutId);
  }, [func, delay, timeoutId]);
}

export const usePaymentVerification = () => {
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  const verifyPayment = async (sessionId: string) => {
    try {
      setChecking(true);
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });
      
      if (error) throw error;
      
      if (data.paid) {
        setPaymentVerified(true);
        toast.success('Payment verified! You can now start your test.');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error('Failed to verify payment');
      return false;
    } finally {
      setChecking(false);
    }
  };

  const checkSubscriptionInternal = async (retryCount = 0): Promise<boolean> => {
    try {
      setChecking(true);
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Subscription check error:', error);
        
        // Handle specific error types
        if (error.message?.includes('Rate limit')) {
          if (retryCount < 2) {
            // Exponential backoff: wait 2^retryCount seconds
            const delay = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return checkSubscriptionInternal(retryCount + 1);
          } else {
            toast.error('Subscription check rate limited. Please wait a moment.');
            return false;
          }
        }
        
        if (error.message?.includes('Authentication')) {
          console.error('Authentication error during subscription check');
          return false;
        }
        
        throw error;
      }
      
      setLastCheckTime(Date.now());
      return data.subscribed || false;
    } catch (error) {
      console.error('Subscription check error:', error);
      if (retryCount === 0) {
        // Only show error toast on first attempt
        toast.error('Failed to check subscription status');
      }
      return false;
    } finally {
      setChecking(false);
    }
  };

  // Debounced version to prevent rapid successive calls
  const debouncedCheckSubscription = useDebounce(checkSubscriptionInternal, 1000);

  const checkSubscription = useCallback(async (): Promise<boolean> => {
    // Rate limiting: don't check more than once every 30 seconds
    const now = Date.now();
    if (now - lastCheckTime < 30000) {
      console.log('Subscription check rate limited (local)');
      return false;
    }

    return checkSubscriptionInternal();
  }, [lastCheckTime]);

  return {
    paymentVerified,
    checking,
    verifyPayment,
    checkSubscription,
    setPaymentVerified
  };
};
