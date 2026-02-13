# 🎬 INSTRUCCIONES FINALES - Autopilot Scheduler

Excelente, has recibido la carpeta completa **AutopilotScheduler** lista para usar.

---

## ✅ Qué incluye

Esta carpeta contiene TODA la lógica del piloto automático de LeadOS - Maribel, **empaquetada, modular y reutilizable** para otros sistemas de lead generation.

### 📦 Componentes:

✅ **Workflow N8N completamente configurado** (`linkedin-outreach-active.json`)
   - Schedule Trigger ACTIVADO ⏰
   - Scraping automático 🔍
   - Análisis con IA 🤖
   - Almacenamiento Google Sheets 💾

✅ **Configuración modular** 
   - `config/credentials.json` → Tus API Keys
   - `config/schedule-config.json` → Horarios
   - `config/target-config.json` → Clientes/ICP

✅ **Scripts de utilidad**
   - Install, Verify, Activate, Rollback, Monitor

✅ **Documentación completa**
   - SETUP.md (paso a paso)
   - TROUBLESHOOTING.md (solución problemas)
   - QUICK-START.md (rápido)
   - API-REFERENCE.md (técnico)

---

## 🚀 Replicar en otro cliente (Ej: Pablo)

### Opción 1: Copiar y personalizar

```bash
# 1. Copiar a tu proyecto
cp -r AutopilotScheduler /tu/proyecto/leados-pablo/autopilot/

# 2. Entrar
cd /tu/proyecto/leados-pablo/autopilot/

# 3. Personalizar config/target-config.json
nano config/target-config.json
# Cambiar "active_target" de "template_maribel" a "template_pablo"

# 4. Instalar
node scripts/install-autopilot.js
```

### Opción 2: Crear nuevo template en config

```bash
# Sin copiar, usa la misma carpeta para múltiples clientes
nano config/target-config.json

# Dentro de "base_templates", añade:
"template_diego": {
  "client_id": "cli_diego_001",
  "client_name": "LeadOS - Diego",
  "description": "Tu descripción aquí",
  "icp": { ... },
  "locations": [...],
  "platforms": { ... }
}

# Luego cambia:
"active_target": "template_diego"
```

---

## 💡 Cómo usar

### Instalación rápida (3 pasos)

```bash
cd AutopilotScheduler

# 1. Editar credenciales
nano config/credentials.json
# Añade tu APIFY_API_TOKEN, OPENAI_API_KEY, GOOGLE_SHEETS_ID

# 2. Instalar
node scripts/install-autopilot.js

# 3. Activar
node scripts/activate-schedule.js
```

**¡Listo! Se ejecutará diariamente a las 08:30 ⏰**

### Monitorear en tiempo real

```bash
node scripts/monitor-executions.js
```

---

## 🎯 Adaptarlo a tu caso

Todos los parámetros se controlan mediante JSON, **sin tocar código**:

### Cambiar horario
```json
// config/schedule-config.json
"default_schedule": {
  "time": "08:30"  // ← Cambiar a tu hora
}
```

### Cambiar plataforma de búsqueda
```json
// config/target-config.json
"platforms": {
  "linkedin": {
    "enabled": true  // ← O false para desactivar
  }
}
```

### Cambiar ICP
```json
"icp": {
  "roles": ["Tu rol1", "Tu rol2"],
  "keywords": ["keyword1", "keyword2"],
  "locations": ["Tu ciudad1", "Tu ciudad2"]
}
```

---

## 🔄 Flujo de trabajo

```
Schedule (8:30 AM)
  ↓
Lee Google Sheet (perfiles/empresas)
  ↓
Scraper Apify (extrae datos)
  ↓
Anti-duplicados (filtra lo que ya tienes)
  ↓
IA OpenAI (analiza leads)
  ↓
Guarda en Google Sheets
  ↓
✨ Completo (repite mañana)
```

---

## 📊 Verificar que funciona

```bash
# Diagnóstico completo
node scripts/verify-autopilot.js

# Debería mostrar: ✨ TODO ESTÁ CORRECTAMENTE CONFIGURADO
```

---

## 🛠️ Troubleshooting rápido

| Problema | Solución |
|----------|----------|
| Schedule no se ejecuta | `node scripts/activate-schedule.js` |
| Credenciales inválidas | Edita `config/credentials.json` |
| Google Sheets no actualiza | Verifica Sheet ID en credentials.json |
| Workflow no aparece en N8N | Importa `n8n-workflows/linkedin-outreach-active.json` |

Más ayuda en: `docs/TROUBLESHOOTING.md`

---

## 📁 Estructura de carpetas

```
AutopilotScheduler/
├── config/                          # Tus configuraciones
│   ├── credentials.json             # API Keys (⚠️ No commitear)
│   ├── schedule-config.json         # Horarios
│   └── target-config.json           # Clientes/ICP
│
├── scripts/                         # Utilidades
│   ├── install-autopilot.js         # Setup
│   ├── verify-autopilot.js          # Validar
│   ├── activate-schedule.js         # Activar
│   ├── monitor-executions.js        # Logs
│   └── rollback.js                  # Desactivar
│
├── n8n-workflows/                  # Workflows N8N
│   └── linkedin-outreach-active.json # El workflow (ACTIVO)
│
├── docs/                            # Documentación
│   ├── SETUP.md                     # Guía detallada
│   ├── TROUBLESHOOTING.md           # Solución problemas
│   ├── QUICK-START.md               # Rápido
│   └── API-REFERENCE.md             # Técnico
│
├── README.md
├── package.json
└── .gitignore                       # No commitear credenciales
```

---

## 📝 Próximos pasos

### 1. Inmediatamente
- [ ] Copiar carpeta a tu proyecto
- [ ] Editar `config/credentials.json` con tus keys
- [ ] Ejecutar `node scripts/install-autopilot.js`

### 2. Dentro de 1 hora
- [ ] Verificar con `node scripts/verify-autopilot.js`
- [ ] Importar workflow en N8N
- [ ] Conectar credenciales en N8N

### 3. Dentro de 24h
- [ ] Confirmar que se ejecutó a las 08:30
- [ ] Revisar Google Sheets con resultados
- [ ] Ajustar `config/target-config.json` si es necesario

### 4. Expandir a otros clientes
- [ ] Crear template nuevo en `config/target-config.json`
- [ ] Activar con `"active_target": "template_nuevo"`
- [ ] Ejecutar `node scripts/activate-schedule.js`

---

## 💬 Dudas frecuentes

**¿Necesito modificar código?**
No. Todo se configura via JSON en `config/`

**¿Funciona con otros clientes?**
Sí. Añade templates en `config/target-config.json` y cambia `active_target`

**¿Cómo dejo de ejecutarme automáticamente?**
`node scripts/rollback.js`

**¿Dónde veo los resultados?**
En Google Sheets especificado en `credentials.json` → Sheet ID

---

## 🎉 ¡Estás listo!

El autopilot está completamente configurado y modular. Úsalo en LeadOS - Maribel primero, luego réplicalo fácilmente a otros sistemas.

**Cualquier duda → Lee los docs o ejecuta los scripts de diagnóstico 🔧**

---

**Última actualización:** 12 Febrero 2026  
**Versión:** 1.0.0  
**Status:** ✅ PRODUCCIÓN READY
