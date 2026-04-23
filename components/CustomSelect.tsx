import React, { useState, useRef, useEffect } from 'react';

interface CustomSelectProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, options, onChange, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || label);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex flex-col text-left px-4 border-r border-brand-black/10 last:border-0 relative ${className}`} ref={containerRef}>
      <label className="text-[10px] font-bold text-brand-green uppercase tracking-widest mb-1">{label}</label>
      <div 
        className="bg-transparent text-brand-black font-semibold cursor-pointer flex items-center justify-between group h-6"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`truncate text-sm ${!value || value === 'any' || value === 'Any Type' ? 'text-brand-black/60' : 'text-brand-black'}`}>
            {displayLabel}
        </span>
        <svg 
          className={`w-3 h-3 ml-2 transition-transform duration-300 text-brand-green ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-brand-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-brand-black/5 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 ring-1 ring-brand-black/5">
          <div className="max-h-64 overflow-y-auto custom-scrollbar py-2">
            {options.map((option) => (
              <div
                key={option.value}
                className={`px-4 py-3 text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-brand-green hover:text-white ${value === option.value ? 'bg-brand-green/10 text-brand-green' : 'text-brand-black'}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
