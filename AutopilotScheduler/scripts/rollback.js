#!/usr/bin/env node

/**
 * Rollback - Desactivar Autopilot
 * Deshabilita el schedule trigger y desactiva el workflow
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
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️ ',
    info: 'ℹ️ ',
    action: '⚡'
  };
  
  const colorMap = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    action: colors.cyan
  };
  
  console.log(`${colorMap[type]}${icons[type]} ${msg}${colors.reset}`);
}

async function rollback() {
  log('action', `${colors.cyan}═════════════════════════════════════════${colors.reset}`);
  log('action', `${colors.cyan}  DESACTIVAR AUTOPILOT (ROLLBACK)${colors.reset}`);
  log('action', `${colors.cyan}═════════════════════════════════════════${colors.reset}\n`);

  try {
    // Confirmación
    console.log(`${colors.red}⚠️  ADVERTENCIA: Esto desactivará el autopilot${colors.reset}`);
    console.log(`   El schedule trigger ya NO se ejecutará automáticamente\n`);

    // 1. Desactivar workflow
    log('action', 'Desactivando workflow N8N...');
    const workflowFile = './n8n-workflows/linkedin-outreach-active.json';
    
    if (fs.existsSync(workflowFile)) {
      let workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));
      workflow.active = false;

      // Desactivar schedule trigger
      if (workflow.nodes) {
        for (const node of workflow.nodes) {
          if (node.type === 'n8n-nodes-base.scheduleTrigger' || node.name.includes('Schedule')) {
            node.disabled = true;
            log('success', `Schedule trigger desactivado: ${node.name}`);
          }
        }
      }

      fs.writeFileSync(workflowFile, JSON.stringify(workflow, null, 2));
      log('success', 'Workflow desactivado');
    }

    // 2. Actualizar schedule config
    log('action', 'Actualizando configuración...');
    const scheduleConfig = JSON.parse(fs.readFileSync('./config/schedule-config.json', 'utf8'));
    scheduleConfig.default_schedule.enabled = false;
    fs.writeFileSync('./config/schedule-config.json', JSON.stringify(scheduleConfig, null, 2));
    log('success', 'Configuración actualizada');

    // 3. Actualizar status
    if (fs.existsSync('./config/autopilot-status.json')) {
      const status = JSON.parse(fs.readFileSync('./config/autopilot-status.json', 'utf8'));
      status.schedule_active = false;
      status.rollback_at = new Date().toISOString();
      fs.writeFileSync('./config/autopilot-status.json', JSON.stringify(status, null, 2));
    }

    // Resumen
    log('action', '\n' + '═'.repeat(50));
    log('success', `${colors.red}✓ AUTOPILOT DESACTIVADO${colors.reset}\n`);

    console.log(`${colors.yellow}❌ El schedule trigger ha sido desactivado${colors.reset}`);
    console.log(`Para reactivar, ejecuta: ${colors.cyan}node scripts/activate-schedule.js${colors.reset}\n`);

  } catch (e) {
    log('error', `Error en rollback: ${e.message}`);
    process.exit(1);
  }
}

rollback().catch(e => {
  log('error', `Error fatal: ${e.message}`);
  process.exit(1);
});
