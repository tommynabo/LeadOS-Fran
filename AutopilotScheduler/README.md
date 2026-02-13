# 🤖 Autopilot Scheduler - Lead Generation Automation

**Sistema modular de automatización para lead generation con piloto automático activado.**

Este paquete contiene toda la lógica necesaria para ejecutar búsquedas de leads de forma automática en horarios programados usando N8N + Apify + OpenAI.

---

## 📋 ¿Qué incluye?

✅ **Workflow N8N completamente configurado y ACTIVADO**
✅ **Schedule Trigger** ejecutándose diariamente
✅ **Sistema Anti-duplicados**
✅ **Generación automática de análisis con IA**
✅ **Almacenamiento en Google Sheets**
✅ **Reutilizable en múltiples sistemas**

---

## 🚀 Instalación Rápida

### **Paso 1: Copiar la carpeta**
```bash
cp -r AutopilotScheduler /ruta/tu/proyecto/lead-generation-system/
```

### **Paso 2: Configurar credenciales**
Edita `config/credentials.json` con tus IDs y keys:
```json
{
  "APIFY_API_TOKEN": "tu_token_apify",
  "OPENAI_API_KEY": "tu_key_openai",
  "GOOGLE_SHEETS_ID": "tu_sheet_id",
  "SCHEDULE_HOUR": 8,
  "SCHEDULE_MINUTE": 30
}
```

### **Paso 3: Importar en N8N**
1. Ve a N8N Dashboard
2. **Import → From File**
3. Selecciona `n8n-workflows/linkedin-outreach-active.json`
4. Las credenciales se conectarán automáticamente

### **Paso 4: Verificar Estado**
```bash
node scripts/verify-autopilot.js
```

---

## 📁 Estructura

```
AutopilotScheduler/
├── n8n-workflows/
│   ├── linkedin-outreach-active.json      # Workflow principal (ACTIVADO)
│   ├── gmail-outreach-active.json         # Workflow alternativo Gmail
│   └── comment-automation.json             # Solo comentarios automáticos
│
├── config/
│   ├── credentials.json                   # API Keys y configuración
│   ├── schedule-config.json               # Horarios de ejecución
│   └── target-lists/                      # Listas de perfiles/empresas
│       ├── linkedin-profiles.json
│       └── email-targets.json
│
├── scripts/
│   ├── install-autopilot.js               # Setup inicial
│   ├── verify-autopilot.js                # Validar configuración
│   ├── activate-schedule.js               # Activar schedule trigger
│   ├── monitor-executions.js              # Monitorear runs
│   └── rollback.js                        # Desactivar si falla
│
├── docs/
│   ├── SETUP.md                           # Guía paso a paso
│   ├── TROUBLESHOOTING.md                 # Solución de problemas
│   └── API-REFERENCE.md                   # Documentación técnica
│
└── README.md                              # Este archivo
```

---

## ⚙️ Configuración Personalizada

### **Cambiar horario de ejecución:**
Edita `config/schedule-config.json`:
```json
{
  "frequency": "daily",
  "hour": 8,
  "minute": 30,
  "timezone": "Europe/Madrid"
}
```

### **Usar múltiples horarios:**
```json
{
  "schedules": [
    {"hour": 8, "minute": 30, "label": "Mañana"},
    {"hour": 14, "minute": 0, "label": "Tarde"},
    {"hour": 18, "minute": 30, "label": "Noche"}
  ]
}
```

### **Cambiar targets (ICP, ubicaciones, etc.):**
Edita `config/target-lists/` para cada cliente

---

## 🔄 Cómo funciona el Autopiloto

```
⏰ Schedule Trigger (8:30 AM)
  ↓
📋 Lee Google Sheet (Perfiles/Empresas)
  ↓
🔍 Scraper: Extrae datos (Apify)
  ↓
🛡️ Anti-duplicados: Filtra histórico
  ↓
🤖 IA Analysis: GPT-4o-mini genera insights
  ↓
💾 Almacena en Google Sheets
  ↓
📧 (Opcional) Envía mensaje DM/Email
```

---

## 🎯 Estados y Logs

El autopiloto registra todos los eventos:

```
✅ [08:30] Schedule trigger iniciado
✅ [08:31] 125 perfiles cargados desde Sheet
⚠️  [08:35] 28 duplicados descartados
✅ [08:40] 97 leads nuevos identificados
✅ [08:55] IA analysis completado
✅ [09:00] 97 resultados guardados en Sheet
```

Para ver logs en tiempo real:
```bash
node scripts/monitor-executions.js
```

---

## 🔧 Comandos Útiles

| Comando | Función |
|---------|---------|
| `npm run setup` | Instalación inicial completa |
| `npm run verify` | Verificar configuración |
| `npm run activate` | Activar schedule |
| `npm run deactivate` | Pausar schedule |
| `npm run test` | Ejecutar un ciclo de prueba |
| `npm run logs` | Ver logs en tiempo real |
| `npm run reset` | Reiniciar todo |

---

## 🚨 Troubleshooting

### **"Schedule no se ejecuta a la hora indicada"**
- Verifica timezone en `schedule-config.json`
- Revisa que N8N está corriendo: `systemctl status n8n`
- Trigger debe tener `"disabled": false`

### **"Credenciales inválidas"**
- Revisa `credentials.json` tiene valores correctos
- Reconnecta en N8N Dashboard
- Verifica permisos de Google Sheets API

### **"Error en Apify"**
- Valida `APIFY_API_TOKEN` está activo
- Revisa cuota disponible: https://console.apify.com/account/limits
- Los actores pueden haber cambiado de ID

### **"IA no genera análisis"**
- Verifica `OPENAI_API_KEY` tiene saldo
- Revisa que modelo `gpt-4o-mini` está disponible
- Lee errors en logs detallados

---

## 📊 Integración con otros sistemas

Este autopilot es **agnóstico** y se adapta a:

- ✅ LeadOS (Maribel)
- ✅ MuseOS (Pablo)
- ✅ CRM personalizados
- ✅ Pipedrive, HubSpot, etc.

Solo necesitas:
1. **Google Sheet con datos iniciales**
2. **Credenciales API actualizadas**
3. **Target config (ICP, ubicaciones)**

---

## 📈 Monitorear desempeño

```bash
node scripts/analytics.js
```

Muestra:
- Leads generados por día
- Tasa de duplicados
- Tiempo promedio de análisis
- Errores más frecuentes
- Cost per lead

---

## 🔐 Seguridad

- ✅ Credenciales separadas en `config/`
- ✅ Nunca commits credenciales (`credentials.json` en `.gitignore`)
- ✅ Rate limiting automático en Apify
- ✅ Anti-spam: máx 100 leads/hora

---

## 💬 Soporte

Si tienes dudas:
1. Lee `docs/SETUP.md` (guía detallada)
2. Revisa `docs/TROUBLESHOOTING.md`
3. Ejecuta `npm run verify` para diagnóstico

---

## 📝 Licencia

Uso libre para sistemas de lead generation. Adaptalo a tus necesidades.

**Última actualización:** 12 Febrero 2026
