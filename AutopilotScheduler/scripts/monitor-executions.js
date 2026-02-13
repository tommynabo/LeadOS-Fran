#!/usr/bin/env node

/**
 * Monitor Autopilot Executions
 * Muestra logs en tiempo real y estadísticas
 */

const fs = require('fs');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(type, msg) {
  const timestamp = new Date().toLocaleTimeString('es-ES', { hour12: false });
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️ ',
    info: 'ℹ️ ',
    log: '📋'
  };
  
  const colorMap = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    log: colors.cyan
  };
  
  console.log(`${colorMap[type]}${icons[type]} [${timestamp}] ${msg}${colors.reset}`);
}

function displayDashboard() {
  console.clear();
  
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║       AUTOPILOT SCHEDULER - MONITOR DASHBOARD          ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Leer status
  try {
    if (fs.existsSync('./config/autopilot-status.json')) {
      const status = JSON.parse(fs.readFileSync('./config/autopilot-status.json', 'utf8'));
      
      console.log(`${colors.cyan}📊 ESTADÍSTICAS GENERALES${colors.reset}`);
      console.log(`   Instalado: ${new Date(status.installed_at).toLocaleDateString('es-ES')}`);
      console.log(`   Ejecuciones totales: ${colors.yellow}${status.total_executions}${colors.reset}`);
      console.log(`   Leads generados: ${colors.green}${status.total_leads_generated}${colors.reset}`);
      
      if (status.last_execution) {
        console.log(`   Última ejecución: ${new Date(status.last_execution).toLocaleString('es-ES')}\n`);
      }
    }
  } catch (e) {
    log('warning', 'No se puede leer status');
  }

  // Leer schedule config
  try {
    const schedule = JSON.parse(fs.readFileSync('./config/schedule-config.json', 'utf8'));
    
    console.log(`${colors.cyan}⏰ SCHEDULE CONFIGURADO${colors.reset}`);
    console.log(`   Estado: ${schedule.active ? colors.green + '✅ ACTIVO' : colors.red + '❌ INACTIVO'}${colors.reset}`);
    console.log(`   Horario: ${schedule.default_schedule.time}`);
    console.log(`   Zona horaria: ${schedule.default_schedule.timezone}`);
    console.log(`   Max leads/ejecución: ${schedule.run_settings.max_leads_per_execution}\n`);
  } catch (e) {
    log('warning', 'No se puede leer schedule config');
  }

  // Simular logs en vivo
  console.log(`${colors.cyan}📝 ÚLTIMAS ACTIVIDADES (simulado)${colors.reset}`);
  log('success', '[08:30] Schedule trigger iniciado');
  log('info', '[08:31] Cargando perfiles desde Google Sheets...');
  log('success', '[08:32] 125 perfiles cargados');
  log('info', '[08:35] Ejecutando scrapers de Apify...');
  log('warning', '[08:42] 28 duplicados descartados');
  log('success', '[08:45] 97 leads nuevos identificados');
  log('info', '[08:50] Generando análisis con IA...');
  log('success', '[08:55] Análisis completado');
  log('success', '[09:00] Guardando resultados en Google Sheets...');
  log('success', '[09:05] ✨ EJECUCIÓN COMPLETADA - 97 leads procesados');

  console.log(`\n${colors.yellow}💡 TIPS:${colors.reset}`);
  console.log(`   • Presiona Ctrl+C para salir`);
  console.log(`   • Revisa los logs reales en N8N Dashboard`);
  console.log(`   • Verifica Google Sheets para ver resultados\n`);
}

// Mostrar dashboard inicial
displayDashboard();

// Actualizar cada 30 segundos (en un monitor real, sería en vivo)
setInterval(() => {
  // Aquí irían actualizaciones en vivo desde N8N API
  // Por ahora es una simulación
}, 30000);

// Instrucciones de salida
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Saliendo del monitor...${colors.reset}`);
  process.exit(0);
});
