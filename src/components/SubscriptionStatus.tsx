
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUILanguage } from '@/contexts/UILanguageContext';

interface SubscriptionInfo {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
}

interface SubscriptionStatusProps {
  onSubscriptionUpdate?: (subscriptionInfo: SubscriptionInfo) => void;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ onSubscriptionUpdate }) => {
  const { t } = useUILanguage();
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        if (error.message?.includes('Rate limit')) {
          setError('Rate limited. Please try again in a moment.');
        } else if (error.message?.includes('Authentication')) {
          setError('Authentication error. Please sign in again.');
        } else {
          setError('Failed to check subscription status');
        }
        return;
      }
      
      setSubscriptionInfo(data);
      
      // Notify parent component of subscription update
      if (onSubscriptionUpdate) {
        onSubscriptionUpdate(data);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setError('Failed to check subscription status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 h-10 w-10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            {t.common.error}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={checkSubscription}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Only show Premium status for users with the specific Premium subscription
  const isPremium = subscriptionInfo?.subscribed && subscriptionInfo?.subscription_tier === 'Premium';

  return (
    <Card className={isPremium ? 'border-green-200' : 'border-gray-200'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isPremium ? (
            <>
              <Crown className="h-5 w-5 text-palavox-purple" />
              {t.subscription.premiumMember}
            </>
          ) : (
            <>
              <Clock className="h-5 w-5 text-gray-500" />
              {t.subscription.freeAccount}
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPremium ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{t.subscription.unlimitedAttempts}</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{t.subscription.premiumFeatures}</span>
            </div>
            {subscriptionInfo.subscription_end && (
              <p className="text-xs text-gray-600 mt-2">
                {t.subscription.subscriptionRenews} {new Date(subscriptionInfo.subscription_end).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {t.subscription.payPerTest}
            </p>
            <Button 
              size="sm" 
              className="w-full bg-palavox-purple hover:bg-palavox-purple/90"
              onClick={() => toast.info('Premium subscription coming soon!')}
            >
              {t.subscription.upgradeButton}
            </Button>
          </div>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-3"
          onClick={checkSubscription}
          disabled={loading}
        >
          {loading ? t.subscription.checking : t.subscription.refreshStatus}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;
