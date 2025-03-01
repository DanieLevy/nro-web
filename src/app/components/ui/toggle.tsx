"use client"

import React from 'react';

interface ToggleProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export function Toggle({ 
  pressed, 
  onPressedChange, 
  size = 'md', 
  children, 
  className = '' 
}: ToggleProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2',
    lg: 'px-4 py-3 text-lg'
  };

  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={`
        inline-flex items-center justify-center rounded-md font-medium
        transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        ${pressed ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent hover:text-accent-foreground'}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
} 