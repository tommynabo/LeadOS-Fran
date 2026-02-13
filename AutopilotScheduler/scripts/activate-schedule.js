#!/usr/bin/env node

/**
 * Activate Schedule Trigger
 * Activa el schedule trigger en N8N para que se ejecute automáticamente
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

async function activateSchedule() {
  log('action', `${colors.cyan}═════════════════════════════════════════${colors.reset}`);
  log('action', `${colors.cyan}  ACTIVAR SCHEDULE TRIGGER${colors.reset}`);
  log('action', `${colors.cyan}═════════════════════════════════════════${colors.reset}\n`);

  try {
    // 1. Leer configuración
    log('info', 'Leyendo configuración del schedule...');
    const scheduleConfig = JSON.parse(fs.readFileSync('./config/schedule-config.json', 'utf8'));

    if (!scheduleConfig.default_schedule.enabled) {
      log('warning', 'El schedule está deshabilitado en config');
      console.log('\nPara activar, edita ./config/schedule-config.json:');
      console.log('  "default_schedule": { "enabled": true, ... }');
      return;
    }

    // 2. Leer workflow N8N
    log('info', 'Leyendo workflow de N8N...');
    const workflowFile = './n8n-workflows/linkedin-outreach-active.json';
    
    if (!fs.existsSync(workflowFile)) {
      log('error', 'Workflow no encontrado: linkedin-outreach-active.json');
      process.exit(1);
    }

    let workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));

    // 3. Activar workflow
    log('action', 'Activando workflow...');
    workflow.active = true;

    // 4. Encontrar y activar Schedule Trigger
    let scheduleTriggerId = null;
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      for (const node of workflow.nodes) {
        if (node.type === 'n8n-nodes-base.scheduleTrigger' || node.name.includes('Schedule')) {
          log('success', `Schedule trigger encontrado: ${node.id}`);
          node.disabled = false; // Activar
          
          // Configurar horario
          if (node.parameters && node.parameters.rule) {
            const [hour, minute] = scheduleConfig.default_schedule.time.split(':').map(Number);
            node.parameters.rule.interval = [{
              triggerAtHour: hour,
              triggerAtMinute: minute
            }];
            log('success', `Horario configurado: ${scheduleConfig.default_schedule.time}`);
          }
          
          scheduleTriggerId = node.id;
        }
      }
    }

    if (!scheduleTriggerId) {
      log('warning', 'No se encontró Schedule Trigger en el workflow');
    }

    // 5. Guardar cambios
    log('action', 'Guardando cambios...');
    fs.writeFileSync(workflowFile, JSON.stringify(workflow, null, 2));
    log('success', 'Workflow guardado con Schedule activado');

    // 6. Actualizar status
    const statusFile = './config/autopilot-status.json';
    if (fs.existsSync(statusFile)) {
      let status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      status.schedule_active = true;
      status.schedule_time = scheduleConfig.default_schedule.time;
      status.schedule_activated_at = new Date().toISOString();
      fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
    }

    // Resumen
    log('action', '\n' + '═'.repeat(50));
    log('success', `${colors.green}✨ SCHEDULE ACTIVADO CORRECTAMENTE${colors.reset}\n`);

    console.log(`${colors.blue}📋 DETALLES:${colors.reset}`);
    console.log(`   ⏰ Horario: ${scheduleConfig.default_schedule.time}`);
    console.log(`   🌍 Zona horaria: ${scheduleConfig.default_schedule.timezone}`);
    console.log(`   🔄 Tipo: ${scheduleConfig.default_schedule.type}`);
    console.log(`   📝 Descripción: ${scheduleConfig.default_schedule.description}\n`);

    console.log(`${colors.yellow}📌 IMPORTANTE:${colors.reset}`);
    console.log(`1. El workflow se ejecutará automáticamente a las ${scheduleConfig.default_schedule.time}`);
    console.log(`2. N8N debe estar corriendo continuamente`);
    console.log(`3. Para ver logs: node scripts/monitor-executions.js`);
    console.log(`4. Para desactivar: node scripts/rollback.js\n`);

    console.log(`${colors.green}✅ El Autopilot está ahora ACTIVO y se ejecutará automáticamente${colors.reset}`);

  } catch (e) {
    log('error', `Error activando schedule: ${e.message}`);
    process.exit(1);
  }
}

activateSchedule().catch(e => {
  log('error', `Error fatal: ${e.message}`);
  process.exit(1);
});
