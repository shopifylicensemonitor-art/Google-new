import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface VoiceToTextButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'outline' | 'ghost' | 'default' | 'secondary';
  label?: string;
}

export function VoiceToTextButton({
  onTranscript,
  className = '',
  size = 'sm',
  variant = 'outline',
  label = 'Voice Input',
}: VoiceToTextButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            currentTranscript += result[0].transcript;
          }
        }
        if (currentTranscript.trim()) {
          onTranscript(currentTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast({
            title: 'Microphone Access Denied',
            description: 'Please grant microphone permissions in your browser settings to use voice input.',
            variant: 'destructive',
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition initialization error:', err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [onTranscript]);

  const toggleListening = async () => {
    // If browser lacks Web Speech API, attempt microphone permission check as fallback
    if (!isSupported) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          toast({
            title: 'Microphone Active',
            description: 'Voice recognition speech-to-text requires Chrome or Safari on mobile.',
          });
        } else {
          toast({
            title: 'Speech Recognition Unavailable',
            description: 'Your browser does not support speech recognition.',
            variant: 'destructive',
          });
        }
      } catch (err) {
        toast({
          title: 'Microphone Permission Denied',
          description: 'Unable to access microphone.',
          variant: 'destructive',
        });
      }
      return;
    }

    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      toast({
        title: 'Voice Input Stopped',
        description: 'Dictation paused.',
      });
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast({
          title: 'Listening...',
          description: 'Speak into your microphone to dictate content.',
        });
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setIsListening(false);
      }
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={isListening ? 'default' : variant}
      onClick={toggleListening}
      className={`gap-1.5 transition-all ${
        isListening
          ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-md'
          : 'hover:border-[#635bff]/50 hover:text-[#635bff]'
      } ${className}`}
      title={isListening ? 'Click to stop listening' : 'Start voice dictation'}
    >
      {isListening ? (
        <>
          <MicOff className="h-3.5 w-3.5 animate-bounce" />
          {label && <span className="text-xs font-semibold">Listening...</span>}
        </>
      ) : (
        <>
          <Mic className="h-3.5 w-3.5 text-rose-500" />
          {label && <span className="text-xs font-semibold">{label}</span>}
        </>
      )}
    </Button>
  );
}
