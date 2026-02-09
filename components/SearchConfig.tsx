import React, { useState } from 'react';
import { Play, Clock, Zap, Users } from 'lucide-react';
import { SearchConfigState } from '../lib/types';

interface SearchConfigProps {
  config: SearchConfigState;
  onChange: (updates: Partial<SearchConfigState>) => void;
  onSearch: () => void;
  onStop: () => void;
  isSearching: boolean;
}

export function SearchConfig({ config, onChange, onSearch, onStop, isSearching }: SearchConfigProps) {
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('09:00');

  // Hardcoded goal text as per screenshot instruction
  const MANUAL_GOAL_TEXT = "Objetivo: Mujeres directivas/gerentes, +40 años, buscando reinvención, marca personal, autoras/speakers";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeIn_0.5s_ease-out]">

      {/* CARD 1: MANUAL GENERATOR */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Zap className="w-5 h-5 text-blue-400 fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Generador Manual</h3>
            <p className="text-xs text-zinc-400">Creación bajo demanda</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 tracking-wider">
              <span>CANTIDAD DE LEADS</span>
              <span>MAX: 50</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={config.maxResults}
                onChange={(e) => onChange({ maxResults: parseInt(e.target.value) })}
                disabled={isSearching}
                className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
              />
              <div className="w-12 h-10 bg-zinc-800 rounded-md border border-zinc-700 flex items-center justify-center font-mono font-bold text-white">
                {config.maxResults}
              </div>
            </div>
          </div>

          {/* Goal Description (Static) */}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
              <span className="text-zinc-200 font-bold block mb-1">Objetivo:</span>
              {MANUAL_GOAL_TEXT}
            </p>
          </div>

          {/* Action Button */}
          {isSearching ? (
            <button
              onClick={onStop}
              className="w-full py-3 rounded-lg font-bold text-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
            >
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Detener Búsqueda
            </button>
          ) : (
            <button
              onClick={onSearch}
              className="w-full py-3 rounded-lg font-bold text-sm bg-cyan-400 text-black hover:bg-cyan-300 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Generar Ahora
            </button>
          )}

        </div>
      </div>

      {/* CARD 2: AUTO PILOT */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4">
          {/* Status Dot */}
          <div className={`w-3 h-3 rounded-full ${autoPilotEnabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-700'}`} />
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <Clock className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Piloto Automático</h3>
            <p className="text-xs text-zinc-400">Activo diariamente</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          {/* Clock Display */}
          <div className="text-5xl font-bold text-zinc-200 tracking-tighter font-mono group-hover:text-white transition-colors">
            {scheduledTime}
          </div>

          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="bg-transparent text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-700 hover:text-zinc-300 hover:border-zinc-500 focus:outline-none transition-colors text-center cursor-pointer w-24"
          />
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Cambiar Hora</span>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-300">Estado del Sistema</span>

          <button
            onClick={() => setAutoPilotEnabled(!autoPilotEnabled)}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${autoPilotEnabled ? 'bg-white' : 'bg-zinc-700'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-black shadow-sm transform transition-transform duration-300 ${autoPilotEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

    </div>
  );
}
