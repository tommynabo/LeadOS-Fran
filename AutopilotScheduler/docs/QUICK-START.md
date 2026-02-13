# 🚀 Quick Start Guide

## Instalación Rápida en 3 Pasos

### 1️⃣ Copiar y Entrar
```bash
cp -r AutopilotScheduler /tu/proyecto/
cd /tu/proyecto/AutopilotScheduler
```

### 2️⃣ Configurar Credenciales
```bash
# Edita estas 3 variables en config/credentials.json:
APIFY_API_TOKEN="apify_api_xxxxx"          # De Apify Console
OPENAI_API_KEY="sk-proj-xxxxx"             # De OpenAI API Keys
GOOGLE_SHEETS_ID="1pUXTM6xNdC-OZ4gTDKk..." # De tu Sheet URL
```

### 3️⃣ Instalar y Activar
```bash
node scripts/install-autopilot.js
node scripts/activate-schedule.js
```

**¡Listo! El autopilot se ejecutará diariamente a las 08:30 ⏰**

---

## 📁 Estructura

```
config/
  ├── credentials.json          # API Keys (⚠️ No commitear)
  ├── schedule-config.json      # Horarios de ejecución
  └── target-config.json        # Clientes y búsquedas

scripts/
  ├── install-autopilot.js      # Setup inicial
  ├── verify-autopilot.js       # Validar config
  ├── activate-schedule.js      # Activar automático
  ├── monitor-executions.js     # Ver logs
  └── rollback.js               # Desactivar

n8n-workflows/
  └── linkedin-outreach-active.json  # Workflow N8N (ACTIVO)

docs/
  ├── SETUP.md                  # Guía detallada
  ├── TROUBLESHOOTING.md        # Solución de problemas
  └── API-REFERENCE.md          # Documentación técnica
```

---

## 💡 Comandos Esenciales

| Comando | Función |
|---------|---------|
| `node scripts/install-autopilot.js` | Setup inicial |
| `node scripts/verify-autopilot.js` | Validar todo |
| `node scripts/activate-schedule.js` | Activar automático |
| `node scripts/rollback.js` | Desactivar |
| `node scripts/monitor-executions.js` | Ver logs en vivo |

---

## 🎯 Personalizar por Cliente

Edita `config/target-config.json`:

```json
{
  "active_target": "template_maribel",  // ← Cambia aquí
  "base_templates": {
    "template_maribel": {
      "client_name": "LeadOS - Maribel",
      "icp": { "roles": ["CEO", "Fundadora", ...] }
    },
    "template_pablo": {
      "client_name": "MuseOS - Pablo",
      "icp": { "roles": ["Coach", "Autor", ...] }
    }
  }
}
```

---

## 🆘 Problemas Comunes

| Problema | Solución |
|----------|----------|
| Schedule no se ejecuta | Ver `docs/TROUBLESHOOTING.md` #1 |
| "Invalid credentials" | Ver `docs/TROUBLESHOOTING.md` #2 |
| Google Sheets no actualiza | Ver `docs/TROUBLESHOOTING.md` #5 |
| Workflow no aparece en N8N | Ver `docs/TROUBLESHOOTING.md` #9 |

---

## 📖 Documentación Completa

- **Setup paso a paso**: [docs/SETUP.md](./SETUP.md)
- **Solución de problemas**: [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **API Reference**: [docs/API-REFERENCE.md](./API-REFERENCE.md)

---

**¿Necesitas ayuda? Lee los docs o ejecuta `node scripts/verify-autopilot.js` 🔧**
