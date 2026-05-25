'use client';

import React, { useState, KeyboardEvent } from 'react';
import { Plus, X, Pill, Search } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/lib/utils';
import type { MedicineItem } from '@/lib/utils';

interface TextInputProps {
  onMedicinesReady: (medicines: MedicineItem[]) => void;
  disabled?: boolean;
  initialMedicines?: MedicineItem[];
}

export default function TextInput({ onMedicinesReady, disabled, initialMedicines = [] }: TextInputProps) {
  const [medicines, setMedicines] = useState<MedicineItem[]>(initialMedicines);
  const [inputValue, setInputValue] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const addMedicine = () => {
    const val = inputValue.trim();
    if (!val) return;

    // Split by comma to handle multiple at once
    const parts = val.split(',').map((p) => p.trim()).filter(Boolean);
    const newMeds: MedicineItem[] = parts.map((part) => ({ brand: part, dose: null, active_ingredient: null }));

    setMedicines((prev) => {
      const all = [...prev, ...newMeds];
      // Deduplicate by brand name
      return all.filter((m, i, arr) => arr.findIndex((x) => x.brand.toLowerCase() === m.brand.toLowerCase()) === i);
    });
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') addMedicine();
  };

  const removeMedicine = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    if (medicines.length === 0) return;
    onMedicinesReady(medicines);
  };

  // Common Bangladeshi medicines for quick add
  const quickMeds = ['Napa', 'Ace', 'Seclo', 'Amoxil', 'Flagyl', 'Renova', 'Nexum', 'Losectil'];

  return (
    <div className="space-y-4">
      {/* Input field */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="medicine-text-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ওষুধের নাম লিখুন (যেমন: Napa, Seclo)"
            className="pl-9 bangla"
            disabled={disabled}
          />
        </div>
        <Button onClick={addMedicine} disabled={!inputValue.trim() || disabled} size="icon" id="add-medicine-btn">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick add chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground self-center mr-1 bangla">দ্রুত যোগ করুন:</span>
        {quickMeds.map((med) => (
          <button
            key={med}
            onClick={() => {
              if (!medicines.find((m) => m.brand.toLowerCase() === med.toLowerCase())) {
                setMedicines((prev) => [...prev, { brand: med, dose: null, active_ingredient: null }]);
              }
            }}
            disabled={disabled}
            className={cn(
              'px-2.5 py-1 text-xs rounded-full border transition-all duration-150',
              medicines.find((m) => m.brand.toLowerCase() === med.toLowerCase())
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground'
            )}
          >
            {med}
          </button>
        ))}
      </div>

      {/* Medicine tags */}
      {medicines.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-xs text-muted-foreground bangla">
            নির্বাচিত ওষুধসমূহ ({medicines.length}টি):
          </p>
          <div className="flex flex-wrap gap-2">
            {medicines.map((med, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-sm group"
              >
                <Pill className="w-3 h-3 text-primary" />
                <span className="bangla font-medium">{med.brand}</span>
                <button
                  onClick={() => removeMedicine(i)}
                  disabled={disabled}
                  className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Symptoms (optional) */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground bangla">
          উপসর্গ / অবস্থা (ঐচ্ছিক):
        </label>
        <Input
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="যেমন: জ্বর, মাথাব্যথা, গর্ভাবস্থা"
          className="bangla text-sm"
          disabled={disabled}
        />
      </div>

      {/* Analyze button */}
      <Button
        onClick={handleAnalyze}
        disabled={medicines.length === 0 || disabled}
        className="w-full"
        size="lg"
        id="analyze-text-btn"
      >
        <Search className="w-4 h-4 mr-2" />
        <span className="bangla">
          {medicines.length === 0 ? 'ওষুধ যোগ করুন' : `${medicines.length}টি ওষুধ বিশ্লেষণ করুন`}
        </span>
      </Button>
    </div>
  );
}
