
import { useEffect } from 'react';
import { toast } from 'sonner';

export const useProgressWarning = (testInProgress: boolean) => {
  useEffect(() => {
    if (!testInProgress) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You will lose all test progress if you leave this page. Are you sure?';
      return e.returnValue;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        toast.warning('⚠️ Keep this tab active to maintain your test session!');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Show initial warning
    toast.info('⚠️ Don\'t navigate away from this page during your test - you\'ll lose all progress!', {
      duration: 5000,
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [testInProgress]);
};
