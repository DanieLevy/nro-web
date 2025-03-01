"use client"

import React from 'react';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step: number;
  className?: string;
}

export function Slider({ value, onValueChange, min, max, step, className = '' }: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseFloat(e.target.value)]);
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={handleChange}
      className={`w-full h-2 bg-primary/20 rounded-full appearance-none cursor-pointer 
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
        [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
        [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 
        [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md 
        [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110 
        ${className}`}
    />
  );
} 