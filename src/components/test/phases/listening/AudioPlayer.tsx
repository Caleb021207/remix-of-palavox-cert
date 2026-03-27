import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, SkipBack, SkipForward } from 'lucide-react';

interface AudioPlayerProps {
  isPlaying: boolean;
  audioLoading: boolean;
  currentTime: number;
  duration: number;
  onPlayAudio: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  isPlaying,
  audioLoading,
  currentTime,
  duration,
  onPlayAudio,
  onSeek,
  onSkip
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 py-4">
      {/* Play/Pause Button */}
      <div className="text-center">
        <Button
          onClick={onPlayAudio}
          size="lg"
          disabled={audioLoading}
          className="btn-primary flex items-center gap-2"
        >
          {audioLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          {audioLoading ? 'Generating Audio...' : isPlaying ? 'Pause Audio' : 'Play Audio'}
        </Button>
      </div>

      {/* Audio Controls - only show when audio is loaded */}
      {duration > 0 && (
        <div className="space-y-2 px-4">
          {/* Time Display */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <Volume2 className="h-4 w-4" />
            <span>{formatTime(duration)}</span>
          </div>

          {/* Seek Slider */}
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={(value) => onSeek(value[0])}
            className="w-full"
          />

          {/* Skip Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSkip(-5)}
              disabled={!isPlaying && currentTime === 0}
            >
              <SkipBack className="h-4 w-4 mr-1" />
              5s
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSkip(5)}
              disabled={!isPlaying && currentTime === 0}
            >
              5s
              <SkipForward className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center">
        You can replay the audio as many times as needed
      </p>
    </div>
  );
};

export default AudioPlayer;
