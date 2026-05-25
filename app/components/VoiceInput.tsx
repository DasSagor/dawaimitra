'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, RefreshCw, Send, Volume2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import type { MedicineItem } from '@/lib/utils';

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceInputProps {
  onMedicinesReady: (medicines: MedicineItem[]) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onMedicinesReady, onError, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRec = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;
    if (!SpeechRec) setIsSupported(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRec = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRec) {
      setIsSupported(false);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const recognition = new SpeechRec();
    recognition.lang = 'bn-BD';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) setTranscript((prev) => (prev + final).trim() + ' ');
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      if (event.error === 'not-allowed') {
        onError('মাইক্রোফোন অ্যাক্সেস দেওয়া হয়নি। ব্রাউজার সেটিংস পরীক্ষা করুন।');
      } else if (event.error === 'no-speech') {
        // Only log no-speech, don't throw harsh error as it interrupts flow
        console.warn('কোনো কথা শোনা যায়নি।');
      } else if (event.error === 'network') {
        onError('ইন্টারনেট সংযোগ সমস্যা বা স্পিচ রিকগনিশন সার্ভারে সমস্যা।');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setInterimTranscript('');
    } catch (err) {
      console.error(err);
      onError('মাইক্রোফোন শুরু করতে সমস্যা হয়েছে।');
      setIsListening(false);
    }
  }, [onError]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      startListening();
    }
  }, [isListening, startListening]);

  const handleSubmit = () => {
    if (!transcript.trim()) return;
    if (isListening && recognitionRef.current) recognitionRef.current.stop();

    // Parse transcript into medicine list
    // Split by common delimiters: comma, "আর", "এবং", "ও", space-and
    const parts = transcript
      .split(/[,،।\n]|আর|এবং|\sও\s/gi)
      .map((p) => p.trim())
      .filter((p) => p.length > 1);

    const medicines: MedicineItem[] = parts.map((part) => ({
      brand: part,
      dose: null,
      active_ingredient: null,
    }));

    if (medicines.length === 0) {
      onError('কোনো ওষুধের নাম পাওয়া যায়নি। স্পষ্টভাবে বলুন।');
      return;
    }

    onMedicinesReady(medicines);
  };

  const playExample = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        'আমি নাপা পাঁচশো মিলিগ্রাম এবং সেকলো খাচ্ছি'
      );
      utterance.lang = 'bn-BD';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-6 rounded-xl border border-yellow-800 bg-yellow-950/30 text-center space-y-2">
        <MicOff className="w-8 h-8 text-yellow-400 mx-auto" />
        <p className="bangla text-yellow-300 text-sm">
          আপনার ব্রাউজার ভয়েস ইনপুট সমর্থন করে না। Chrome বা Edge ব্যবহার করুন।
        </p>
      </div>
    );
  }

  const displayText = transcript + (interimTranscript ? ` ${interimTranscript}` : '');

  return (
    <div className="space-y-4">
      {/* Mic button */}
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative">
          <button
            onClick={toggleListening}
            disabled={disabled}
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300',
              'shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isListening
                ? 'bg-red-600 text-white recording-ring scale-110 shadow-red-500/30'
                : 'bg-primary text-primary-foreground hover:scale-105 hover:shadow-primary/30'
            )}
            id="voice-mic-btn"
            aria-label={isListening ? 'রেকর্ডিং বন্ধ করুন' : 'রেকর্ডিং শুরু করুন'}
          >
            {isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>
        </div>

        <p className={cn('text-sm bangla font-medium transition-colors', isListening ? 'text-red-400' : 'text-muted-foreground')}>
          {isListening ? '🔴 শোনা হচ্ছে... বাংলায় বলুন' : 'বাটনে চেপে বলুন'}
        </p>
      </div>

      {/* Transcript box */}
      <div
        className={cn(
          'min-h-[100px] p-4 rounded-xl border bg-secondary/30 transition-all duration-300',
          isListening ? 'border-red-600/50 bg-red-950/10' : 'border-border',
          displayText && 'border-primary/30'
        )}
      >
        {displayText ? (
          <p className="bangla text-sm leading-relaxed">
            <span className="text-foreground">{transcript}</span>
            {interimTranscript && (
              <span className="text-muted-foreground italic"> {interimTranscript}</span>
            )}
          </p>
        ) : (
          <p className="bangla text-sm text-muted-foreground text-center mt-4">
            {isListening
              ? 'ওষুধের নাম বলুন যেমন: "নাপা আর সেকলো"'
              : 'এখানে আপনার কথা দেখাবে...'}
          </p>
        )}
      </div>

      {/* Example hint */}
      <button
        onClick={playExample}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mx-auto"
      >
        <Volume2 className="w-3 h-3" />
        <span className="bangla">উদাহরণ শুনুন</span>
      </button>

      {/* Actions */}
      <div className="flex gap-2">
        {transcript && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => { setTranscript(''); setInterimTranscript(''); }}
            title="মুছুন"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!transcript.trim() || disabled}
          className="flex-1"
          size="lg"
          id="voice-submit-btn"
        >
          <Send className="w-4 h-4 mr-2" />
          <span className="bangla">বিশ্লেষণ করুন</span>
        </Button>
      </div>
    </div>
  );
}
