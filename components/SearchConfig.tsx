import React, { useState } from 'react';
import { Play, Clock, Zap, Users, Mail, Linkedin } from 'lucide-react';
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
  const [autoPilotTarget, setAutoPilotTarget] = useState(25);

  // Target for Fran: Health & Fitness Sector
  const MANUAL_GOAL_TEXT = "Objetivo: Dueños y Fundadores de Gimnasios, Centros de Fitness, Clínicas de Salud y Bienestar.";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeIn_0.5s_ease-out]">

      {/* CARD 1: MANUAL GENERATOR */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden group flex flex-col justify-between">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />

        <div>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Zap className="w-5 h-5 text-blue-400 fill-current" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Generador Manual</h3>
                <p className="text-xs text-zinc-400">Creación bajo demanda</p>
              </div>
            </div>

            {/* Source Selector (Mini) */}
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => onChange({ source: 'gmail' })}
                title="Gmail + Maps"
                className={`p-2 rounded-md transition-all ${config.source === 'gmail' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Mail className="w-4 h-4" />
              </button>
              <div className="w-[1px] bg-zinc-800 mx-1 my-1"></div>
              <button
                onClick={() => onChange({ source: 'linkedin' })}
                title="LinkedIn"
                className={`p-2 rounded-md transition-all ${config.source === 'linkedin' ? 'bg-zinc-800 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Linkedin className="w-4 h-4" />
              </button>
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
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.maxResults}
                  onChange={(e) => onChange({ maxResults: parseInt(e.target.value) || 1 })}
                  disabled={isSearching}
                  className="w-14 h-10 bg-zinc-800 rounded-lg border border-zinc-700 flex items-center justify-center font-mono font-bold text-white text-center focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Goal Description (Static) */}
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                <span className="text-zinc-200 font-bold block mb-1">Objetivo:</span>
                {MANUAL_GOAL_TEXT}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
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
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden group flex flex-col justify-between">
        <div className="absolute top-0 right-0 p-4">
          {/* Status Dot */}
          <div className={`w-3 h-3 rounded-full ${autoPilotEnabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-700'}`} />
        </div>

        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <Clock className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Piloto Automático</h3>
              <p className="text-xs text-zinc-400">Activo diariamente</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4 py-2">
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

            {/* Auto Pilot Quantity */}
            <div className="w-full bg-zinc-950/30 rounded-lg p-3 mt-4 border border-zinc-800/50">
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                <span>Leads Diarios</span>
                <span>{autoPilotTarget}</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-3 h-3 text-zinc-600" />
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={autoPilotTarget}
                  onChange={(e) => setAutoPilotTarget(parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-green-500"
                />
              </div>
            </div>
          </div>
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
