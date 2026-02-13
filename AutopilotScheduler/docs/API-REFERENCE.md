# 📊 API REFERENCE - Referencia Técnica

## Configuración de Schedule

### schedule-config.json

```json
{
  "active": true,                              // Autopilot habilitado globalmente
  "default_schedule": {
    "enabled": true,                           // Activar schedule por defecto
    "type": "daily",                           // "daily", "weekly", "monthly"
    "timezone": "Europe/Madrid",               // IANA timezone
    "time": "08:30",                           // HH:MM formato 24h
    "description": "Búsqueda automática diaria"
  },
  
  "run_settings": {
    "max_concurrent_runs": 1,                  // Máximo runs simultáneos
    "max_leads_per_execution": 50,             // Leads máximo por ejecución
    "batch_size_for_processing": 10,           // Procesar en lotes de N
    "timeout_minutes": 60,                     // Timeout en minutos
    "retry_on_failure": true,                  // Reintentar si falla
    "max_retries": 2,                          // Máximo número de reintentos
    "retry_delay_seconds": 300                 // Espera entre reintentos
  },

  "notifications": {
    "send_email_on_success": false,
    "send_email_on_failure": true,
    "email_recipients": ["admin@example.com"],
    "discord_webhook": "https://discord.com/api/webhooks/xxxx"
  }
}
```

---

## Configuración de Targets

### target-config.json

```json
{
  "active_target": "template_maribel",  // Cuál template usar actualmente
  
  "base_templates": {
    "template_maribel": {
      "client_id": "cli_maribel_001",
      "client_name": "LeadOS - Maribel",
      "description": "Descripción del cliente",
      
      "icp": {
        "age_min": 40,                   // Edad mínima (si aplica)
        "roles": ["CEO", "Fundadora"],   // Puestos a buscar
        "industries": ["Coaching"],      // Industrias
        "keywords": ["marca personal"]   // Keywords ICP
      },
      
      "locations": ["Madrid", "Barcelona"],  // Ubicaciones
      
      "platforms": {
        "linkedin": {
          "enabled": true,               // Activar LinkedIn
          "search_mode": "deep",         // "fast" o "deep"
          "depth": 10,                   // Profundidad de búsqueda
          "max_results": 20              // Máximo resultados
        },
        "gmail": {
          "enabled": false,              // Desactivar Gmail
          "search_mode": "fast",
          "depth": 5,
          "max_results": 30
        }
      },
      
      "ai_analysis": {
        "enabled": true,                 // Usar IA para análisis
        "model": "gpt-4o-mini",         // Modelo OpenAI
        "focus_on": [                    // Qué analizar
          "psychological_profile",
          "business_moment",
          "sales_angle"
        ]
      }
    }
  }
}
```

---

## Credenciales Schema

### credentials.json

```json
{
  "APIFY_API_TOKEN": "apify_api_xxxxx",           // Token Apify
  "OPENAI_API_KEY": "sk-proj-xxxxx",              // Key OpenAI
  "GOOGLE_SHEETS_API_KEY": "AIzaSyxxxxx",         // Key Google Sheets
  "GOOGLE_SHEETS_ID": "1pUXTM6xNdC-OZ4gTDKk...",  // ID del Sheet
  
  "n8n": {
    "webhook_url": "http://localhost:5678/webhook/",
    "api_url": "http://localhost:5678/api/v1",
    "api_key": "n8n_api_key_xxxxxxxxxx"
  },
  
  "schedule": {
    "timezone": "Europe/Madrid",
    "daily": {
      "hour": 8,
      "minute": 30
    }
  },
  
  "limits": {
    "max_leads_per_run": 50,
    "max_runs_per_day": 3,
    "batch_size": 10,
    "timeout_seconds": 3600
  }
}
```

---

## Status File Schema

### autopilot-status.json

```json
{
  "installed_at": "2026-02-12T10:30:00.000Z",
  "version": "1.0.0",
  "active": true,
  "schedule_active": true,
  "schedule_time": "08:30",
  "schedule_activated_at": "2026-02-12T10:45:00.000Z",
  
  "last_execution": "2026-02-12T08:30:15.000Z",
  "total_executions": 15,
  "total_leads_generated": 347,
  
  "recent_runs": [
    {
      "timestamp": "2026-02-12T08:30:00.000Z",
      "status": "success",
      "leads_found": 23,
      "duplicates_removed": 5,
      "duration_minutes": 25,
      "errors": null
    }
  ]
}
```

---

## N8N Workflow Structure

### Nodos Principales

```
Schedule Trigger (⏰)
  ↓
Read Profiles Sheet (📋)
  ↓
Loop Over Profiles (🔄)
  ↓
├─→ Profile Scraper (🔍)
├─→ Contact Scraper (📧)
├─→ Posts Scraper (📲)
│
└─→ AI Analysis (🤖)
    └─→ Comment Generator
        └─→ Update Sheet (💾)
```

### Parámetros Clave

| Nodo | Parámetro | Valor |
|------|-----------|-------|
| Schedule Trigger | triggerAtHour | 8 |
| Schedule Trigger | triggerAtMinute | 30 |
| Google Sheets Read | sheetName | "PROFILES TO SCRAPE" |
| Apify (Maps) | maxCrawledPlaces | 50 |
| Apify (Posts) | limit | 3 |
| OpenAI | model | "gpt-4o-mini" |
| Google Sheets Write | operation | "appendOrUpdate" |

---

## Environmental Variables

Si prefieres usar `.env`:

```bash
APIFY_API_TOKEN=apify_api_xxxxx
OPENAI_API_KEY=sk-proj-xxxxx
GOOGLE_SHEETS_ID=1pUXTM6xNdC-OZ4gTDKk...
N8N_WEBHOOK_URL=http://localhost:5678/webhook/
N8N_TIMEZONE=Europe/Madrid
N8N_SCHEDULE_HOUR=8
N8N_SCHEDULE_MINUTE=30
```

Luego en scripts:
```javascript
require('dotenv').config();
const apiToken = process.env.APIFY_API_TOKEN;
```

---

## Respuesta Esperada de APIs

### Google Sheets Read
```json
{
  "LIST": "username",
  "QUERY": "marca personal",
  "LOCATION": "Madrid"
}
```

### Apify Response
```json
{
  "data": {
    "itemsCount": 125,
    "items": [
      {
        "name": "Empresa",
        "email": "contact@empresa.com",
        "website": "empresa.com"
      }
    ]
  }
}
```

### OpenAI Response
```json
{
  "choices": [
    {
      "message": {
        "content": "{\"psychologicalProfile\": \"...\", \"salesAngle\": \"...\"}"
      }
    }
  ]
}
```

---

## Logs y Eventos

### Log Format
```
[TIMESTAMP] [LEVEL] [NODE] MESSAGE

Ejemplo:
[08:30:15] [INFO] [Schedule] Schedule trigger iniciado
[08:31:00] [SUCCESS] [Maps Scraper] 125 empresas encontradas
[08:35:45] [WARNING] [Anti-Duplicados] 28 leads descartados
[08:45:30] [ERROR] [OpenAI] Rate limit exceeded
[09:00:00] [SUCCESS] [Google Sheets] 97 leads guardados
```

### Log Levels
- `INFO` - Información general
- `SUCCESS` - Operación exitosa
- `WARNING` - Advertencia (continúa)
- `ERROR` - Error (puede continuar)
- `CRITICAL` - Error fatal (detiene)

---

## Rate Limits

### Apify
- Max requests/segundo: 10
- Max actores simultáneos: 5
- Monthly credits: depende del plan

### OpenAI
- GPT-4o-mini: $0.15 per 1M input tokens
- Rate limit: 500 requests/minuto
- Timeout: 30 segundos

### Google Sheets API
- Reads/writes por segundo: 100-300
- Batch request limit: 40,000 cells
- Rate limit: 60 requests/minuto por usuario

---

## Webhooks (Opcional)

### Discord Webhook
```
https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

Mensaje enviado:
```json
{
  "content": "✅ Autopilot ejecutado",
  "embeds": [
    {
      "title": "Ejecución exitosa",
      "fields": [
        {"name": "Leads", "value": "97"},
        {"name": "Duplicados", "value": "5"}
      ]
    }
  ]
}
```

---

## Troubleshooting API

### Test de conectividad

```bash
# Apify
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.apify.com/v2/datasets/default/items

# OpenAI
curl -H "Authorization: Bearer YOUR_KEY" \
  -X POST https://api.openai.com/v1/chat/completions

# Google Sheets
curl -X GET "https://sheets.googleapis.com/v4/spreadsheets/YOUR_ID"
```

---

**Para más info: consulta [SETUP.md](./SETUP.md) y [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**
