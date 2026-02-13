#!/usr/bin/env node

/**
 * Install Autopilot Scheduler
 * Valida configuración, credenciales y prepara N8N
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(type, msg) {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️ ',
    info: 'ℹ️ ',
    step: '📋'
  };
  
  const colorMap = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    step: colors.cyan
  };
  
  console.log(`${colorMap[type]}${icons[type]} [${timestamp}] ${msg}${colors.reset}`);
}

async function installAutopilot() {
  log('step', '🤖 Iniciando instalación del Autopilot Scheduler...\n');

  // Step 1: Verificar estructura de carpetas
  log('step', 'Paso 1: Verificando estructura de carpetas');
  
  const requiredDirs = [
    './n8n-workflows',
    './config',
    './scripts',
    './docs'
  ];

  for (const dir of requiredDirs) {
    if (fs.existsSync(dir)) {
      log('success', `Directorio encontrado: ${dir}`);
    } else {
      log('error', `Directorio NO encontrado: ${dir}`);
      process.exit(1);
    }
  }

  // Step 2: Verificar archivos de configuración
  log('step', '\nPaso 2: Verificando archivos de configuración');
  
  const requiredFiles = [
    './config/credentials.json',
    './config/schedule-config.json',
    './config/target-config.json',
    './n8n-workflows/linkedin-outreach-active.json'
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log('success', `Archivo encontrado: ${file}`);
    } else {
      log('warning', `Archivo NO encontrado: ${file} (será creado después)`);
    }
  }

  // Step 3: Validar credenciales
  log('step', '\nPaso 3: Validando credenciales');
  
  try {
    const credentials = JSON.parse(fs.readFileSync('./config/credentials.json', 'utf8'));
    
    const requiredCreds = [
      'APIFY_API_TOKEN',
      'OPENAI_API_KEY',
      'GOOGLE_SHEETS_ID'
    ];

    let allValid = true;
    for (const cred of requiredCreds) {
      if (credentials[cred] && credentials[cred] !== `${cred}_placeholder`) {
        log('success', `Credencial configurada: ${cred}`);
      } else {
        log('warning', `Credencial PENDIENTE: ${cred}`);
        allValid = false;
      }
    }

    if (!allValid) {
      log('warning', 'Algunas credenciales están pendientes. Edita ./config/credentials.json');
    }
  } catch (e) {
    log('error', `Error leyendo credentials.json: ${e.message}`);
  }

  // Step 4: Validar configuración de schedule
  log('step', '\nPaso 4: Validando configuración de schedule');
  
  try {
    const schedule = JSON.parse(fs.readFileSync('./config/schedule-config.json', 'utf8'));
    
    if (schedule.active && schedule.default_schedule.enabled) {
      log('success', `⏰ Schedule ACTIVADO: ${schedule.default_schedule.time} (${schedule.default_schedule.timezone})`);
    } else {
      log('warning', '⏰ Schedule está desactivado');
    }

    if (schedule.run_settings.max_leads_per_execution) {
      log('success', `Límite de leads: ${schedule.run_settings.max_leads_per_execution}/ejecución`);
    }
  } catch (e) {
    log('error', `Error leyendo schedule-config.json: ${e.message}`);
  }

  // Step 5: Validar target config
  log('step', '\nPaso 5: Validando configuración de targets');
  
  try {
    const targets = JSON.parse(fs.readFileSync('./config/target-config.json', 'utf8'));
    
    if (targets.active_target) {
      log('success', `Target activo: ${targets.active_target}`);
    }

    const activeTemplate = targets.base_templates[targets.active_target];
    if (activeTemplate) {
      log('success', `Cliente: ${activeTemplate.client_name}`);
      log('success', `ICP: ${activeTemplate.icp.keywords.join(', ') || 'Genérico'}`);
      log('success', `Ubicaciones: ${activeTemplate.locations.join(', ')}`);
      log('success', `Plataformas: ${Object.keys(activeTemplate.platforms).filter(p => activeTemplate.platforms[p].enabled).join(', ')}`);
    }
  } catch (e) {
    log('error', `Error leyendo target-config.json: ${e.message}`);
  }

  // Step 6: Crear archivo de status
  log('step', '\nPaso 6: Creando archivo de status');
  
  const statusFile = {
    installed_at: new Date().toISOString(),
    version: "1.0.0",
    active: true,
    last_execution: null,
    total_executions: 0,
    total_leads_generated: 0
  };

  fs.writeFileSync('./config/autopilot-status.json', JSON.stringify(statusFile, null, 2));
  log('success', 'Archivo de status creado: ./config/autopilot-status.json');

  // Final Summary
  log('step', '\n' + '='.repeat(60));
  log('success', '✨ INSTALACIÓN COMPLETADA\n');
  
  console.log(`${colors.cyan}█████████████████████████████████████████████████████████${colors.reset}`);
  console.log(`${colors.green}✅ Autopilot Scheduler está listo para usar${colors.reset}`);
  console.log(`${colors.cyan}█████████████████████████████████████████████████████████${colors.reset}\n`);

  console.log(`${colors.yellow}📋 PRÓXIMOS PASOS:${colors.reset}`);
  console.log(`1. Edita ./config/credentials.json con tus API Keys`);
  console.log(`2. Personaliza ./config/target-config.json si necesario`);
  console.log(`3. Importa el workflow en N8N: ./n8n-workflows/linkedin-outreach-active.json`);
  console.log(`4. Ejecuta: node scripts/verify-autopilot.js`);
  console.log(`5. Ejecuta: node scripts/activate-schedule.js\n`);

  console.log(`${colors.blue}💡 COMANDOS ÚTILES:${colors.reset}`);
  console.log(`   node scripts/verify-autopilot.js    → Verificar configuración`);
  console.log(`   node scripts/activate-schedule.js   → Activar schedule`);
  console.log(`   node scripts/monitor-executions.js  → Ver logs en tiempo real`);
  console.log(`   node scripts/rollback.js             → Desactivar autopilot\n`);
}

installAutopilot().catch(e => {
  log('error', `Fallo en instalación: ${e.message}`);
  process.exit(1);
});
