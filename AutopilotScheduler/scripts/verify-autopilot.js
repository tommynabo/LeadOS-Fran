#!/usr/bin/env node

/**
 * Verify Autopilot Configuration
 * Valida que todo esté correctamente configurado
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
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️ ',
    info: 'ℹ️ ',
    check: '🔍'
  };
  
  const colorMap = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    check: colors.cyan
  };
  
  console.log(`${colorMap[type]}${icons[type]} ${msg}${colors.reset}`);
}

async function verifyAutopilot() {
  log('check', `${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  log('check', `${colors.cyan}  DIAGNÓSTICO AUTOPILOT SCHEDULER${colors.reset}`);
  log('check', `${colors.cyan}═══════════════════════════════════════════${colors.reset}\n`);

  let errors = [];
  let warnings = [];

  // 1. Verificar credenciales
  log('check', '🔐 Verificando Credenciales...');
  try {
    const creds = JSON.parse(fs.readFileSync('./config/credentials.json', 'utf8'));
    
    const checks = {
      'APIFY_API_TOKEN': 'apify_api_',
      'OPENAI_API_KEY': 'sk-proj-',
      'GOOGLE_SHEETS_ID': '1'
    };

    Object.entries(checks).forEach(([key, expected]) => {
      if (!creds[key] || creds[key].includes('xxxx')) {
        warnings.push(`❌ ${key} no está configurada`);
        log('warning', `${key} - NO CONFIGURADA`);
      } else {
        log('success', `${key} - ✓ Configure`);
      }
    });
  } catch (e) {
    errors.push(`No se puede leer credentials.json: ${e.message}`);
    log('error', `credentials.json inaccesible: ${e.message}`);
  }

  // 2. Verificar schedule
  log('check', '\n⏰ Verificando Schedule...');
  try {
    const schedule = JSON.parse(fs.readFileSync('./config/schedule-config.json', 'utf8'));
    
    if (schedule.active && schedule.default_schedule.enabled) {
      log('success', `Schedule ACTIVO - ${schedule.default_schedule.time} (${schedule.default_schedule.timezone})`);
    } else {
      warnings.push('Schedule está desactivado');
      log('warning', 'Schedule DESACTIVADO');
    }

    if (schedule.run_settings.max_leads_per_execution) {
      log('success', `Max leads/run: ${schedule.run_settings.max_leads_per_execution}`);
    }

    if (schedule.run_settings.retry_on_failure) {
      log('success', 'Reintentos habilitados en caso de fallo');
    }
  } catch (e) {
    errors.push(`schedule-config.json inaccesible: ${e.message}`);
    log('error', `schedule-config inaccesible`);
  }

  // 3. Verificar targets
  log('check', '\n🎯 Verificando Targets...');
  try {
    const targets = JSON.parse(fs.readFileSync('./config/target-config.json', 'utf8'));
    
    const activeTarget = targets.base_templates[targets.active_target];
    if (activeTarget) {
      log('success', `Target activo: ${activeTarget.client_name}`);
      log('success', `ICP: ${activeTarget.icp.roles.slice(0, 3).join(', ')}...`);
      log('success', `Ubicaciones: ${activeTarget.locations.join(', ')}`);
      
      const enabledPlatforms = Object.entries(activeTarget.platforms)
        .filter(([_, config]) => config.enabled)
        .map(([name]) => name);
      log('success', `Plataformas: ${enabledPlatforms.join(', ')}`);
    } else {
      warnings.push('Active target no encontrado');
      log('warning', `Target '${targets.active_target}' no existe`);
    }
  } catch (e) {
    errors.push(`target-config.json inaccesible: ${e.message}`);
    log('error', 'target-config inaccesible');
  }

  // 4. Verificar workflow N8N
  log('check', '\n⚙️  Verificando Workflow N8N...');
  const workflowFile = './n8n-workflows/linkedin-outreach-active.json';
  if (fs.existsSync(workflowFile)) {
    try {
      const workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));
      
      if (workflow.active === true) {
        log('success', 'Workflow N8N: ACTIVO ✓');
      } else {
        warnings.push('Workflow N8N está desactivado');
        log('warning', 'Workflow N8N: DESACTIVADO');
      }

      if (workflow.nodes) {
        log('success', `Nodos en workflow: ${workflow.nodes.length}`);
      }
    } catch (e) {
      errors.push(`Workflow JSON inválido: ${e.message}`);
      log('error', `Workflow inválido: ${e.message}`);
    }
  } else {
    warnings.push('linkedin-outreach-active.json no encontrado');
    log('warning', 'Workflow N8N no encontrado');
  }

  // 5. Verificar archivos de estado
  log('check', '\n📊 Verificando Estado...');
  if (fs.existsSync('./config/autopilot-status.json')) {
    try {
      const status = JSON.parse(fs.readFileSync('./config/autopilot-status.json', 'utf8'));
      log('success', `Instalación: ${new Date(status.installed_at).toLocaleDateString('es-ES')}`);
      log('success', `Ejecuciones totales: ${status.total_executions}`);
      log('success', `Leads generados: ${status.total_leads_generated}`);
    } catch (e) {
      log('warning', 'No se puede leer autopilot-status.json');
    }
  } else {
    log('info', 'Status no inicializado (normal si es primera instalación)');
  }

  // Resumen final
  log('check', '\n' + '═'.repeat(50));
  
  if (errors.length === 0 && warnings.length === 0) {
    log('success', `${colors.green}✨ TODO ESTÁ CORRECTAMENTE CONFIGURADO ✨${colors.reset}`);
    log('success', 'El autopilot está listo para ejecutase');
    process.exit(0);
  } else if (errors.length === 0) {
    log('warning', `⚠️  ${warnings.length} ADVERTENCIA(S) - El autopilot puede funcionar`);
    warnings.forEach((w, i) => log('warning', `${i + 1}. ${w}`));
    process.exit(0);
  } else {
    log('error', `${colors.red}❌ ${errors.length} ERROR(ES) CRÍTICO(S)${colors.reset}`);
    errors.forEach((e, i) => log('error', `${i + 1}. ${e}`));
    log('error', '\nFija los errores antes de ejecutar el autopilot');
    process.exit(1);
  }
}

verifyAutopilot().catch(e => {
  log('error', `Error en verificación: ${e.message}`);
  process.exit(1);
});
