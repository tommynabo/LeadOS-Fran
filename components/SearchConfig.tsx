import React from 'react';
import { Search, Play, Users, Mail, Linkedin } from 'lucide-react';
import { SearchConfigState, PlatformSource } from '../lib/types';
import { PROJECT_CONFIG } from '../config/project';

interface SearchConfigProps {
  config: SearchConfigState;
  onChange: (updates: Partial<SearchConfigState>) => void;
  onSearch: () => void;
  onStop: () => void;
  isSearching: boolean;
}

const PLATFORM_ICONS: Record<PlatformSource, React.ReactNode> = {
  gmail: <Mail className="w-4 h-4 mr-1.5" />,
  linkedin: <Linkedin className="w-4 h-4 mr-1.5" />
};

const PLATFORM_LABELS: Record<PlatformSource, string> = {
  gmail: 'Gmail',
  linkedin: 'LinkedIn'
};

const PLATFORM_DESCRIPTIONS: Record<PlatformSource, string> = {
  gmail: 'Busca empresas en Google Maps y extrae emails',
  linkedin: 'Busca dueños/CEOs de PYMEs en LinkedIn'
};

export function SearchConfig({ config, onChange, onSearch, onStop, isSearching }: SearchConfigProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* Search Input - 5 Cols (HIDDEN/FIXED for Fran) */}
        <div className="md:col-span-5 space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Búsqueda Objetivo (Automática)
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-green-600" />
            </div>
            <div className="block w-full pl-9 pr-3 py-2.5 bg-green-50/50 border border-green-200 rounded-lg text-sm text-green-800 font-medium">
              Sector Wellness & Salud (Predefinido)
            </div>
          </div>
        </div>

        {/* Quantity - 2 Cols */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cantidad</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Users className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="number"
              min="1"
              max="100"
              value={config.maxResults}
              onChange={(e) => onChange({ maxResults: parseInt(e.target.value) || 10 })}
              className="block w-full pl-9 pr-3 py-2.5 bg-secondary/50 border border-input rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-sm transition-all text-gray-900 placeholder:text-gray-500"
              placeholder="10"
              disabled={isSearching}
            />
          </div>
        </div>

        {/* Source Selector - 3 Cols */}
        <div className="md:col-span-3 space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Plataforma</label>
          <div className="flex bg-secondary/50 p-1 rounded-lg border border-input h-[42px]">
            {(['gmail', 'linkedin'] as PlatformSource[]).map((platform) => (
              <button
                key={platform}
                onClick={() => onChange({ source: platform })}
                title={PLATFORM_DESCRIPTIONS[platform]}
                className={`flex-1 flex items-center justify-center rounded-md text-xs font-medium transition-all ${config.source === platform
                  ? 'bg-background shadow-sm text-blue-600 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
                disabled={isSearching}
              >
                <span className={config.source === platform ? 'text-blue-600' : ''}>
                  {PLATFORM_ICONS[platform]}
                </span>
                {PLATFORM_LABELS[platform]}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button - 2 Cols */}
        <div className="md:col-span-2 flex flex-col justify-end">
          {isSearching ? (
            <button
              onClick={onStop}
              className="w-full h-[42px] flex items-center justify-center rounded-lg font-semibold text-sm transition-all shadow-lg shadow-red-500/20 bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]"
            >
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Detener
            </button>
          ) : (
            <button
              onClick={onSearch}
              disabled={!config.query}
              className="w-full h-[42px] flex items-center justify-center rounded-lg font-semibold text-sm transition-all shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 mr-2 fill-current" />
              Iniciar
            </button>
          )}
        </div>
      </div>

      {/* Platform Description */}
      <div className="mt-3 text-xs text-muted-foreground text-center">
        {PLATFORM_DESCRIPTIONS[config.source]}
      </div>
    </div>
  );
}
