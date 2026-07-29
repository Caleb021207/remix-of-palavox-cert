import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { BadgeCheck, ShieldAlert, Search, AlertTriangle } from 'lucide-react';
import { verifyCertificate, type VerificationResult } from '@/services/test/secureTestService';

/**
 * Public certificate verification. No authentication required — a school or
 * employer pastes the certificate ID (or PVX- code) and the server confirms
 * whether that certificate genuinely exists and is still valid.
 */
const VerifyCertificate = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('id') ?? searchParams.get('code') ?? '';

  const [query, setQuery] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const runLookup = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await verifyCertificate(trimmed));
    } catch {
      setResult({ valid: false, error: 'Verification service is unavailable. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initial) runLookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query.trim().startsWith('PVX-') ? { code: query.trim() } : { id: query.trim() });
    runLookup(query);
  };

  const cert = result?.certificate;

  return (
    <div className="flex flex-col min-h-screen bg-palavox-ivory">
      <Navbar />
      <main className="flex-grow container-custom py-16">
        <div className="max-w-2xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Verify a certificate</h1>
            <p className="text-palavox-slate">
              Enter the certificate ID or verification code printed on a Palavox proficiency
              certificate to confirm it is genuine.
            </p>
          </header>

          <Card className="mb-8">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Certificate ID or PVX-XXXXXXXX"
                  aria-label="Certificate ID or verification code"
                />
                <Button type="submit" disabled={loading || !query.trim()}>
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? 'Checking…' : 'Verify'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {result && (
            <Card
              className={`border-t-4 ${result.valid ? 'border-t-emerald-500' : 'border-t-red-500'}`}
            >
              <CardContent className="p-6">
                {result.valid && cert ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="h-8 w-8 text-emerald-600" />
                      <div>
                        <h2 className="text-2xl font-bold text-emerald-800">Valid certificate</h2>
                        <p className="text-sm text-palavox-slate">
                          This record was issued and signed by Palavox Cert.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-palavox-slate">Holder</dt>
                        <dd className="font-medium text-lg">{cert.holderName ?? 'Not recorded'}</dd>
                      </div>
                      <div>
                        <dt className="text-palavox-slate">Proficiency level</dt>
                        <dd className="font-medium text-lg">{cert.cefrLevel}</dd>
                      </div>
                      <div>
                        <dt className="text-palavox-slate">Issued</dt>
                        <dd className="font-medium">
                          {new Date(cert.issuedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-palavox-slate">Expires</dt>
                        <dd className="font-medium">
                          {cert.expiresAt
                            ? new Date(cert.expiresAt).toLocaleDateString()
                            : 'No expiry'}
                        </dd>
                      </div>
                      {cert.functionalLabel && (
                        <div className="sm:col-span-2">
                          <dt className="text-palavox-slate">Descriptor</dt>
                          <dd className="font-medium">{cert.functionalLabel}</dd>
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        <dt className="text-palavox-slate">Verification code</dt>
                        <dd className="font-mono">{cert.verificationCode}</dd>
                      </div>
                    </dl>

                    <div className="flex items-start gap-2 rounded-md bg-blue-50 p-4 text-xs text-blue-900">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>
                        {result.disclaimer ??
                          'Palavox Cert is not an accredited awarding body. This certificate records an AI-assisted assessment intended for placement and progress tracking, and does not replace ACTFL, CEFR or other accredited examinations.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="h-8 w-8 text-red-600" />
                      <h2 className="text-2xl font-bold text-red-800">Not verified</h2>
                    </div>
                    <p className="text-palavox-slate">
                      {result.reason ??
                        result.error ??
                        'No certificate matches that ID or code. It may have been revoked, expired, or the document may not be genuine.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="text-center mt-10">
            <Button asChild variant="outline">
              <Link to="/">Return to home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyCertificate;
