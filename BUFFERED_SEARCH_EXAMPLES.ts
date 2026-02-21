/**
 * EJEMPLOS DE USO - BufferedSearchService
 * 
 * Aquí hay casos reales y configuraciones avanzadas
 */

// ═══════════════════════════════════════════════════════════════════════════
// CASO 1: USO BÁSICO EN COMPONENTE REACT
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { bufferedSearchService } from './services/search/BufferedSearchService';
import { SearchConfigState, Lead } from './lib/types';

function SearchComponent() {
  const [results, setResults] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (config: SearchConfigState) => {
    setIsSearching(true);
    setLogs([]);
    setResults([]);

    bufferedSearchService.startBufferedSearch(
      config,
      // onLog callback
      (message) => {
        console.log(message);
        setLogs(prev => [...prev, message]);
      },
      // onComplete callback
      (leads) => {
        setIsSearching(false);
        setResults(leads);
        console.log(`✅ Búsqueda completada: ${leads.length} leads`);
      }
    );
  };

  return (
    <div>
      <button 
        onClick={() => handleSearch({
          query: 'Gimnasios en Madrid',
          source: 'gmail',
          mode: 'fast',
          maxResults: 10
        })}
        disabled={isSearching}
      >
        {isSearching ? 'Buscando...' : 'Iniciar Búsqueda'}
      </button>
      
      <div>
        <h3>Logs:</h3>
        {logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>

      <div>
        <h3>Resultados ({results.length}):</h3>
        {results.map(lead => (
          <div key={lead.id}>
            <p><strong>{lead.companyName}</strong></p>
            <p>Email: {lead.decisionMaker?.email}</p>
            <p>Web: {lead.website}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchComponent;

// ═══════════════════════════════════════════════════════════════════════════
// CASO 2: BÚSQUEDA CON FILTROS AVANZADOS
// ═══════════════════════════════════════════════════════════════════════════

import { bufferedSearchService } from './services/search/BufferedSearchService';

async function searchWithAdvancedFilters() {
  const config = {
    query: 'Clínicas de Salud',
    source: 'gmail' as const,
    mode: 'deep' as const,
    maxResults: 15,
    advancedFilters: {
      locations: ['Madrid', 'Barcelona', 'Valencia'],
      industries: ['Healthcare', 'Fitness', 'Wellness'],
      jobTitles: ['CEO', 'Fundador', 'Propietario', 'Director General'],
      companySizes: ['small', 'medium'] // 1-1000 employees
    }
  };

  bufferedSearchService.startBufferedSearch(
    config,
    (log) => console.log(log),
    (results) => {
      console.log(`Encontrados ${results.length} leads en sectores específicos`);
      // Procesar resultados...
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CASO 3: BÚSQUEDA REPETIDA CON PROGRESO
// ═══════════════════════════════════════════════════════════════════════════

async function searchMultipleQueries() {
  const queries = [
    'Gimnasios españa',
    'Centros fitness españa',
    'Personal trainers españa'
  ];

  const allResults: any[] = [];

  for (const query of queries) {
    await new Promise<void>((resolve) => {
      bufferedSearchService.startBufferedSearch(
        {
          query,
          source: 'gmail',
          mode: 'fast',
          maxResults: 5
        },
        (log) => console.log(`[${query}] ${log}`),
        (results) => {
          allResults.push(...results);
          console.log(`Acumulados: ${allResults.length} leads`);
          resolve();
        }
      );
    });

    // Pausa entre búsquedas
    await new Promise(r => setTimeout(r, 5000));
  }

  return allResults;
}

// ═══════════════════════════════════════════════════════════════════════════
// CASO 4: DETENER BÚSQUEDA EN PROGRESO
// ═══════════════════════════════════════════════════════════════════════════

function handleStopSearch() {
  bufferedSearchService.stop();
  console.log('Búsqueda detenida');
}

// ═══════════════════════════════════════════════════════════════════════════
// CASO 5: BÚSQUEDA ADAPTATIVA (Ajustar según resultados)
// ═══════════════════════════════════════════════════════════════════════════

async function adaptiveSearch() {
  let leadCount = 0;
  let attempts = 0;
  const maxAttempts = 5;

  while (leadCount < 10 && attempts < maxAttempts) {
    attempts++;

    await new Promise<void>((resolve) => {
      bufferedSearchService.startBufferedSearch(
        {
          query: `Sector salud españa intento ${attempts}`,
          source: attempts % 2 === 0 ? 'gmail' : 'linkedin', // Alternar métodos
          mode: 'deep',
          maxResults: 10 - leadCount // Pedir solo lo que falta
        },
        (log) => {
          if (log.includes('Objetivo alcanzado')) {
            leadCount = 10; // Met goal
          }
        },
        (results) => {
          leadCount += results.length;
          console.log(`Intento ${attempts}: +${results.length} leads (Total: ${leadCount})`);
          resolve();
        }
      );
    });
  }

  console.log(`Búsqueda adaptativa completada: ${leadCount} leads en ${attempts} intentos`);
}

// ═══════════════════════════════════════════════════════════════════════════
// CASO 6: INTEGRACIÓN CON AUTOPILOT
// ═══════════════════════════════════════════════════════════════════════════

async function scheduleBufferedSearch(time: string, quantity: number) {
  // Ejecutar cada día a las 9 AM
  const [hours, minutes] = time.split(':').map(Number);

  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === hours && now.getMinutes() === minutes) {
      console.log(`🤖 Ejecutando búsqueda automática de ${quantity} leads...`);

      bufferedSearchService.startBufferedSearch(
        {
          query: 'Prospección automática diaria',
          source: 'gmail',
          mode: 'fast',
          maxResults: quantity
        },
        (log) => console.log(`[AUTOPILOT] ${log}`),
        (results) => {
          console.log(`✅ Autopilot completado: ${results.length} nuevos leads`);
          // Guardar en BD automáticamente...
        }
      );
    }
  }, 60000); // Revisar cada minuto
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIONES AVANZADAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuración SPEED (Búsqueda rápida, menos análisis)
 */
const SPEED_CONFIG = {
  query: 'Mi búsqueda',
  source: 'gmail',
  mode: 'fast',
  maxResults: 5
  // Sin filtros avanzados = búsqueda más rápida (~15 segundos)
};

/**
 * Configuración QUALITY (Búsqueda profunda, análisis completo)
 */
const QUALITY_CONFIG = {
  query: 'Mi búsqueda',
  source: 'linkedin',
  mode: 'deep',
  maxResults: 20,
  advancedFilters: {
    locations: ['España'],
    industries: ['Tech'],
    companySizes: ['medium', 'large']
  }
  // Con todos los filtros = búsqueda profunda (~40 segundos)
};

/**
 * Configuración BALANCED (Recomendada)
 */
const BALANCED_CONFIG = {
  query: 'Mi búsqueda',
  source: 'gmail',
  mode: 'fast',
  maxResults: 10,
  advancedFilters: {
    locations: ['Madrid']
  }
  // Equilibrio entre velocidad y calidad (~25 segundos)
};

// ═══════════════════════════════════════════════════════════════════════════
// MÉTODOS AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Exportar resultados a CSV
 */
function exportToCSV(results: any[]) {
  const headers = [
    'Empresa',
    'Email',
    'Web',
    'Teléfono',
    'LinkedIn',
    'Resumen',
    'Cuello de Botella'
  ];

  const rows = results.map(lead => [
    lead.companyName,
    lead.decisionMaker?.email || '',
    lead.website,
    lead.phone || '',
    lead.decisionMaker?.linkedin || '',
    lead.aiAnalysis?.executiveSummary || '',
    lead.aiAnalysis?.bottleneck || ''
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

/**
 * Validar lead antes de guardar
 */
function validateLead(lead: any): boolean {
  return !!(
    lead.companyName &&
    lead.companyName !== 'Sin Nombre' &&
    (lead.decisionMaker?.email || lead.website)
  );
}

/**
 * Filtrar duplicados locales
 */
function deduplicateLeads(leads: any[]): any[] {
  const seen = new Set<string>();
  return leads.filter(lead => {
    const key = (lead.website || lead.companyName).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Mostrar estadísticas de búsqueda
 */
function showSearchStatistics(results: any[], timeTaken: number) {
  console.log(`
╔════════════════════════════════════╗
║   ESTADÍSTICAS DE BÚSQUEDA        ║
╠════════════════════════════════════╣
║ Total de Leads:        ${String(results.length).padEnd(15)} ║
║ Tiempo Total:          ${String((timeTaken / 1000).toFixed(1) + 's').padEnd(15)} ║
║ Leads/Segundo:         ${String((results.length / (timeTaken / 1000)).toFixed(2)).padEnd(15)} ║
║ Con Email:             ${String(results.filter(r => r.decisionMaker?.email).length).padEnd(15)} ║
║ Con LinkedIn:          ${String(results.filter(r => r.decisionMaker?.linkedin).length).padEnd(15)} ║
║ Con Análisis Completo: ${String(results.filter(r => r.aiAnalysis?.executiveSummary).length).padEnd(15)} ║
╚════════════════════════════════════╝
  `);
}

export {
  searchWithAdvancedFilters,
  searchMultipleQueries,
  handleStopSearch,
  adaptiveSearch,
  scheduleBufferedSearch,
  exportToCSV,
  validateLead,
  deduplicateLeads,
  showSearchStatistics,
  SPEED_CONFIG,
  QUALITY_CONFIG,
  BALANCED_CONFIG
};
