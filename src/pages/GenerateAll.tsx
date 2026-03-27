import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function GenerateAll() {
  const [status, setStatus] = useState('Triggering generation...');
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (triggered) return;
    
    const trigger = async () => {
      try {
        setTriggered(true);
        setStatus('🚀 Calling generate-all-content function...');
        
        const { data, error } = await supabase.functions.invoke('generate-all-content');
        
        if (error) {
          setStatus(`❌ Error: ${error.message}`);
          console.error('Error:', error);
        } else {
          setStatus('✅ Generation started! Check logs at: https://supabase.com/dashboard/project/jyvmhtterlpszklhgjwp/functions/generate-all-content/logs');
          console.log('Response:', data);
        }
      } catch (err: any) {
        setStatus(`❌ Exception: ${err.message}`);
        console.error('Exception:', err);
      }
    };

    trigger();
  }, [triggered]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Content Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-lg">{status}</p>
          </div>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              The function is running in the background and will generate all 1,728 content items.
              This page can be closed - the generation will continue.
            </p>
            <a 
              href="https://supabase.com/dashboard/project/jyvmhtterlpszklhgjwp/functions/generate-all-content/logs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline mt-2 block"
            >
              View logs →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
