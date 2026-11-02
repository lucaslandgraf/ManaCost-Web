import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'slate' | 'sky';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', className = '' }) => {
  const variantStyles = {
    emerald: 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30',
    amber: 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30',
    rose: 'bg-[#F43F5E]/15 text-[#FB7185] border-[#F43F5E]/30',
    slate: 'bg-[#1E293B] text-[#94A3B8] border-[#334155]',
    sky: 'bg-[#0284C7]/15 text-[#38BDF8] border-[#0284C7]/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};