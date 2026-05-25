'use client';

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, RefreshCw, CheckCircle, AlertCircle, X, ScanLine, AlertOctagon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';
import type { MedicineItem, ExpiryAlert } from '@/lib/utils';

interface ImageUploaderProps {
  onMedicinesExtracted: (medicines: MedicineItem[], expiryAlerts?: ExpiryAlert[]) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onMedicinesExtracted, onError, disabled }: ImageUploaderProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'choose' | 'camera' | 'preview'>('choose');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [scanResult, setScanResult] = useState<MedicineItem[] | null>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);

  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (img) {
      setCapturedImage(img);
      setMode('preview');
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setCapturedImage(base64);
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    setScanResult(null);
    setExpiryAlerts([]);

    try {
      const res = await fetch('/api/scan-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: capturedImage }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error_bangla ?? data.error ?? 'স্ক্যান ব্যর্থ হয়েছে');
      }

      if (!data.medicines || data.medicines.length === 0) {
        onError(data.warning_bangla ?? 'ছবিতে কোনো ওষুধ পাওয়া যায়নি। স্পষ্ট ছবি দিন।');
        setScanResult([]);
        return;
      }

      const alerts: ExpiryAlert[] = data.expiry_alerts ?? [];
      setExpiryAlerts(alerts);
      setScanResult(data.medicines);
      // Pass expiry alerts to parent so ResultCard can show the red banner
      onMedicinesExtracted(data.medicines, alerts);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'ছবি স্ক্যান করতে সমস্যা হয়েছে।');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setScanResult(null);
    setExpiryAlerts([]);
    setMode('choose');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {mode === 'choose' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setCameraError(false); setMode('camera'); }}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border',
              'hover:border-primary hover:bg-primary/5 transition-all duration-200 group',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Camera className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm bangla text-muted-foreground group-hover:text-foreground transition-colors">
              ক্যামেরায় তুলুন
            </span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-border',
              'hover:border-primary hover:bg-primary/5 transition-all duration-200 group',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm bangla text-muted-foreground group-hover:text-foreground transition-colors">
              ছবি আপলোড করুন
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {mode === 'camera' && (
        <div className="space-y-3">
          {cameraError ? (
            <div className="flex flex-col items-center gap-3 p-8 rounded-xl border border-red-800 bg-red-950/30 text-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm bangla text-red-300">ক্যামেরা অ্যাক্সেস পাওয়া যায়নি। ফাইল আপলোড করুন।</p>
              <Button size="sm" variant="outline" onClick={() => { setMode('choose'); fileInputRef.current?.click(); }}>
                ছবি আপলোড করুন
              </Button>
            </div>
          ) : (
            <>
              <div className="relative rounded-xl overflow-hidden border border-border aspect-video bg-black">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: 'environment' }}
                  onUserMediaError={() => setCameraError(true)}
                />
                {/* Scanner overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-40 border-2 border-primary/70 rounded-lg relative">
                    <span className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-primary" />
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-primary" />
                    <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-primary" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-primary" />
                    <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/50 w-8 h-8 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={capture} className="flex-1" id="capture-btn">
                  <Camera className="w-4 h-4 mr-1" />
                  <span className="bangla">ছবি তুলুন</span>
                </Button>
                <Button variant="outline" onClick={() => setMode('choose')} size="icon">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {mode === 'preview' && capturedImage && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-border aspect-video bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="Preview" className="w-full h-full object-contain" />
            {isProcessing && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm bangla text-primary">স্ক্যান করা হচ্ছে...</span>
                </div>
              </div>
            )}
          </div>

          {/* Feature #12: Expiry alert inline display */}
          {expiryAlerts.length > 0 && (
            <div className="p-3 rounded-lg border-2 border-red-600 bg-red-950/40 space-y-1 animate-fade-in">
              <p className="text-xs text-red-300 font-bold flex items-center gap-1 bangla">
                <AlertOctagon className="w-3.5 h-3.5" />
                ⛔ মেয়াদোত্তীর্ণ ওষুধ!
              </p>
              {expiryAlerts.map((alert, i) => (
                <p key={i} className="text-xs text-red-400 bangla ml-4">• {alert.message_bangla}</p>
              ))}
            </div>
          )}

          {scanResult && scanResult.length > 0 && (
            <div className="p-3 rounded-lg border border-green-800 bg-green-950/30 space-y-1 animate-fade-in">
              <p className="text-xs text-green-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span className="bangla">{scanResult.length}টি ওষুধ শনাক্ত হয়েছে</span>
              </p>
              {scanResult.map((m, i) => (
                <p key={i} className="text-xs text-green-300 bangla ml-4">
                  • {m.brand} {m.dose ? `(${m.dose})` : ''} {m.active_ingredient ? `– ${m.active_ingredient}` : ''}
                </p>
              ))}
            </div>
          )}

          {scanResult && scanResult.length === 0 && (
            <div className="p-3 rounded-lg border border-yellow-800 bg-yellow-950/30 flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
              <p className="text-xs bangla text-yellow-300">ছবিতে কোনো ওষুধ পাওয়া যায়নি</p>
            </div>
          )}

          <div className="flex gap-2">
            {!scanResult && (
              <Button onClick={handleScan} disabled={isProcessing} className="flex-1" id="scan-btn">
                <ScanLine className="w-4 h-4 mr-1" />
                <span className="bangla">{isProcessing ? 'স্ক্যান হচ্ছে...' : 'স্ক্যান করুন'}</span>
              </Button>
            )}
            <Button variant="outline" onClick={reset} size={!scanResult ? 'icon' : 'default'} className={!scanResult ? '' : 'flex-1'}>
              <RefreshCw className="w-4 h-4" />
              {scanResult && <span className="ml-1 bangla">আবার করুন</span>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
