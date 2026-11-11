import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, History, Check } from 'lucide-react';

interface HistoryAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  fontMono?: boolean;
  id?: string;
}

export const HistoryAutocompleteInput: React.FC<HistoryAutocompleteInputProps> = ({
  value,
  onChange,
  suggestions,
  placeholder,
  required = false,
  className = '',
  fontMono = false,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtra as sugestões com base no que foi digitado
  const filteredSuggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    if (!query) {
      return suggestions.slice(0, 15);
    }
    return suggestions
      .filter((s) => s.toLowerCase().includes(query))
      .slice(0, 15);
  }, [value, suggestions]);

  const handleSelect = (item: string) => {
    onChange(item);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          required={required}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-3 pr-8 py-2 bg-[#0D1311] border border-[#263530] rounded text-sm text-[#F1F5F3] focus:outline-none focus:border-emerald-500 placeholder:text-[#4A5D54] transition-colors ${
            fontMono ? 'font-mono' : ''
          }`}
        />
        {suggestions.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 p-1 text-[#6A7F75] hover:text-emerald-400 rounded transition-colors cursor-pointer"
            title={`${suggestions.length} sugestões no histórico`}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-150 ${
                isOpen ? 'rotate-180 text-emerald-400' : ''
              }`}
            />
          </button>
        )}
      </div>

      {/* Dropdown de Sugestões do Histórico */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#101714] border border-[#2A3C34] rounded-md shadow-2xl overflow-hidden max-h-52 overflow-y-auto animate-in fade-in-50 duration-100">
          <div className="px-3 py-1.5 bg-[#14201B] border-b border-[#24332C] flex items-center justify-between text-[10px] text-[#889992] font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <History className="w-3 h-3" />
              Histórico Operacional
            </span>
            <span className="text-[#6A7F75]">
              {filteredSuggestions.length} {filteredSuggestions.length === 1 ? 'opção' : 'opções'}
            </span>
          </div>

          <div className="divide-y divide-[#1D2924]">
            {filteredSuggestions.map((item, index) => {
              const isSelected = item.toLowerCase() === (value || '').trim().toLowerCase();
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={`${item}-${index}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isHighlighted
                      ? 'bg-emerald-500/20 text-[#F1F5F3]'
                      : 'hover:bg-[#16231D] text-[#C2CEC8]'
                  }`}
                >
                  <span className={`truncate ${fontMono ? 'font-mono' : ''}`}>
                    {item}
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
