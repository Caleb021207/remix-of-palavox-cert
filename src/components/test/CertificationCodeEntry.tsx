import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useCertificationCode } from '@/hooks/useCertificationCode';

interface CertificationCodeEntryProps {
  onCodeVerified: (code: string, schoolId: string, studentId: string) => void;
  onSkip?: () => void;
}

const CertificationCodeEntry: React.FC<CertificationCodeEntryProps> = ({ 
  onCodeVerified, 
  onSkip 
}) => {
  const [code, setCode] = useState('');
  const { verifyCode, isVerifying, verificationResult } = useCertificationCode();

  const handleVerify = async () => {
    if (!code.trim()) return;
    
    const result = await verifyCode(code.trim());
    
    if (result.isValid && result.schoolId && result.studentId) {
      onCodeVerified(code.trim(), result.schoolId, result.studentId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Certification Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="text"
            placeholder="Enter your certification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isVerifying}
            className="text-center"
          />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Format: CERT-SCHOOL-STUDENT-TIMEProficiency Level-SIGNATURE
          </p>
        </div>

        {verificationResult && !verificationResult.isValid && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {verificationResult.error || 'Invalid certification code'}
              {verificationResult.usageCount >= verificationResult.maxUsage && 
                ' - This code has reached its maximum usage limit (3 tests).'}
            </AlertDescription>
          </Alert>
        )}

        {verificationResult && verificationResult.isValid && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Code verified! Remaining uses: {verificationResult.maxUsage - verificationResult.usageCount}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleVerify} 
            disabled={!code.trim() || isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>
          
          {onSkip && (
            <Button 
              variant="outline" 
              onClick={onSkip}
              className="w-full"
            >
              Continue without code
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>• Each certification code allows 3 test attempts</p>
          <p>• Codes are provided by your school or institution</p>
          <p>• You can still take tests without a code (limited features)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CertificationCodeEntry;