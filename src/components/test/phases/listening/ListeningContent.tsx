
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Volume2 } from 'lucide-react';
import { useUILanguage } from '@/contexts/UILanguageContext';
import AudioPlayer from './AudioPlayer';

interface ListeningContentProps {
  content: any;
  isPlaying: boolean;
  audioLoading: boolean;
  currentTime: number;
  duration: number;
  onPlayAudio: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
}

const ListeningContent: React.FC<ListeningContentProps> = ({
  content,
  isPlaying,
  audioLoading,
  currentTime,
  duration,
  onPlayAudio,
  onSeek,
  onSkip
}) => {
  const { t } = useUILanguage();

  return (
    <Card>
      <CardHeader>
        <h4 className="text-lg font-semibold flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          {t.test.phases.listening.audioPassage}
        </h4>
      </CardHeader>
      <CardContent>
        <div className="bg-palavox-lavender p-4 rounded-lg mb-4">
          <p className="text-sm text-palavox-slate mb-2">{t.test.phases.listening.listenCarefully}</p>
          <div className="text-center py-8">
            <Volume2 className="h-12 w-12 mx-auto text-palavox-purple opacity-50 mb-4" />
            <p className="text-palavox-slate italic">{t.test.phases.listening.audioWillPlay}</p>
          </div>
        </div>
        
        <AudioPlayer
          isPlaying={isPlaying}
          audioLoading={audioLoading}
          currentTime={currentTime}
          duration={duration}
          onPlayAudio={onPlayAudio}
          onSeek={onSeek}
          onSkip={onSkip}
        />
      </CardContent>
    </Card>
  );
};

export default ListeningContent;
