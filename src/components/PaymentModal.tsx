
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Crown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleOneTimePayment = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-payment');
      
      if (error) throw error;
      
      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      
      // Close modal and indicate payment initiated
      onClose();
      toast.success('Payment window opened. Complete your payment to start the test.');
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Choose Your Option
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Card className="border-2 border-palavox-purple">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Crown className="h-6 w-6 text-palavox-purple" />
                <div>
                  <h3 className="font-semibold text-palavox-purple">Premium Subscription</h3>
                  <p className="text-sm text-gray-600">Unlimited tests + exclusive features</p>
                </div>
              </div>
              <Button 
                className="w-full bg-palavox-purple hover:bg-palavox-purple/90"
                onClick={() => {
                  // TODO: Implement subscription checkout
                  toast.info('Subscription feature coming soon!');
                }}
              >
                Get Premium
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="h-6 w-6 text-gray-600" />
                <div>
                  <h3 className="font-semibold">One-Time Test</h3>
                  <p className="text-sm text-gray-600">Single test attempt for $4.99</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleOneTimePayment}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Pay $4.99'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Warning:</strong> If you navigate away from the test page, you will lose all progress and your test attempt will be forfeited.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
