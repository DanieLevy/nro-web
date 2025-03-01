import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const variantStyles = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  outline: 'border border-input bg-background'
};

export function Badge({ 
  variant = 'default', 
  className = '', 
  ...props 
}: BadgeProps) {
  return (
    <div
      className={`
        inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold
        transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    />
  );
} 