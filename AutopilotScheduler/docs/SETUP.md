# 📋 SETUP - Guía Completa de Instalación

## 🎯 Objetivo
Instalar el Autopilot Scheduler en tu sistema de lead generation para ejecutar búsquedas automáticamente cada día.

---

## ⚡ Instalación Exprés (5 minutos)

### 1. Copiar archivos
```bash
# En tu proyecto principal
cp -r AutopilotScheduler ./lead-generation-system/
cd lead-generation-system/AutopilotScheduler
```

### 2. Configurar credenciales
```bash
# Edita config/credentials.json
nano config/credentials.json
```

Necesitas obtener:
- **APIFY_API_TOKEN**: https://console.apify.com → Account → Integrations
- **OPENAI_API_KEY**: https://platform.openai.com → API Keys
- **GOOGLE_SHEETS_ID**: URL de tu Sheet → ID entre `/d/` y `/edit`

```json
{
  "APIFY_API_TOKEN": "apify_api_xxxxx",
  "OPENAI_API_KEY": "sk-proj-xxxxx",
  "GOOGLE_SHEETS_ID": "1pUXTM6xNdC-OZ4gTDKk4E6DqjK-LZ8hVN9poSS4A77w"
}
```

### 3. Instalar
```bash
node scripts/install-autopilot.js
```

Deberías ver:
```
✅ [09:15] 🤖 Iniciando instalación del Autopilot Scheduler...
✅ [09:15] Directorio encontrado: ./n8n-workflows
✅ [09:15] Directorio encontrado: ./config
✅ [09:15] Directorio encontrado: ./scripts
✅ [09:15] Directorio encontrado: ./docs
...
✨ INSTALACIÓN COMPLETADA
```

### 4. Verificar
```bash
node scripts/verify-autopilot.js
```

Deberías ver: ✨ TODO ESTÁ CORRECTAMENTE CONFIGURADO ✨

### 5. Activar Schedule
```bash
node scripts/activate-schedule.js
```

Deberías ver:
```
✨ SCHEDULE ACTIVADO CORRECTAMENTE
⏰ Horario: 08:30
🌍 Zona horaria: Europe/Madrid
```

---

## 📦 Instalación Detallada (15 minutos)

### Paso 1: Preparar directorios

```bash
# Navega a tu proyecto
cd /ruta/tu/proyecto

# Copiar carpeta
cp -r /ruta/AutopilotScheduler ./

# Entrar
cd AutopilotScheduler
ls -la
```

Deberías ver:
```
config/
  ├── credentials.json
  ├── schedule-config.json
  ├── target-config.json
docs/
n8n-workflows/
scripts/
README.md
```

### Paso 2: Obtener Credenciales API

#### 🔑 APIFY_API_TOKEN
1. Ve a https://console.apify.com
2. Clickea en tu cuenta (arriba derecha)
3. **Account Settings → Integrations**
4. Copia el API Token (empieza con `apify_api_`)

#### 🔑 OPENAI_API_KEY
1. Ve a https://platform.openai.com
2. **API Keys** (menú izquierda)
3. **Create new secret key**
4. Copia el valor (empieza con `sk-proj-`)
5. ⚠️ **Guarda en lugar seguro**, no se mostrará de nuevo

#### 🔑 GOOGLE_SHEETS_ID
1. Abre tu Google Sheet
2. La URL será: `https://docs.google.com/spreadsheets/d/1pUXTM6xNdC.../edit`
3. Copia lo que está entre `/d/` y `/edit`
4. Ese es el `GOOGLE_SHEETS_ID`

### Paso 3: Editar credenciales

```bash
# Abre con tu editor favorito
nano config/credentials.json
```

Reemplaza los placeholders:
```json
{
  "APIFY_API_TOKEN": "apify_api_tu_token_aqui",
  "OPENAI_API_KEY": "sk-proj-tu_key_aqui",
  "GOOGLE_SHEETS_ID": "tu_sheet_id_aqui"
}
```

Guarda (Ctrl+X → Y → Enter en nano)

### Paso 4: Personalizar Schedule (Opcional)

```bash
nano config/schedule-config.json
```

Cambiar horario de ejecución:
```json
"default_schedule": {
  "enabled": true,
  "time": "08:30",          ← Cambiar a tu hora
  "timezone": "Europe/Madrid"  ← O tu zona
}
```

Múltiples horarios:
```json
"secondary_schedules": [
  {
    "enabled": true,        ← Activar
    "time": "14:00"
  }
]
```

### Paso 5: Ejecutar instalación

```bash
node scripts/install-autopilot.js
```

El script hará:
- ✅ Verificar estructura de carpetas
- ✅ Validar credenciales
- ✅ Crear archivo de status
- ✅ Preparar todo para N8N

### Paso 6: Importar en N8N

#### Si usas N8N Cloud:
1. Ve a https://app.n8n.cloud
2. **Workflows** (menú izquierda)
3. **Import from file**
4. Selecciona: `n8n-workflows/linkedin-outreach-active.json`
5. Click **Import**

#### Si usas N8N Self-hosted:
1. Ve a tu instancia N8N (ej: http://localhost:5678)
2. **Workflows**
3. **Import**
4. Selecciona el archivo JSON
5. Click **Import**

### Paso 7: Conectar credenciales en N8N

Después de importar:
1. El workflow abrirá
2. Verás nodos con ⚠️ (credenciales faltantes)
3. Para cada uno:
   - Click derecho → **Edit credentials**
   - Conecta con tus cuentas (Google Sheets, Apify, OpenAI)
   - Click **Save**

### Paso 8: Verificar configuración

```bash
node scripts/verify-autopilot.js
```

Debería mostrar:
```
✅ APIFY_API_TOKEN - ✓ Configure
✅ OPENAI_API_KEY - ✓ Configure
✅ GOOGLE_SHEETS_ID - ✓ Configure
✅ Schedule ACTIVO - 08:30 (Europe/Madrid)
✨ TODO ESTÁ CORRECTAMENTE CONFIGURADO
```

### Paso 9: Activar Schedule Trigger

```bash
node scripts/activate-schedule.js
```

Confirmará:
```
✨ SCHEDULE ACTIVADO CORRECTAMENTE
⏰ Horario: 08:30
✅ El Autopilot está ahora ACTIVO
```

### Paso 10: ¡Listo!

El autopilot ahora:
- ✅ Se ejecutará diariamente a las 08:30
- ✅ Scrapeará perfiles de LinkedIn
- ✅ Analizará con IA (GPT-4)
- ✅ Guardará resultados en Google Sheets

---

## 🎯 Personalizar por Cliente

Si tienes múltiples clientes (Maribel, Pablo, etc.):

### config/target-config.json

```json
{
  "active_target": "template_maribel",
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

Para cambiar de cliente:
```bash
# Edita la línea:
"active_target": "template_pablo"
```

---

## 🧪 Prueba Inicial

Antes de dejar que se ejecute automáticamente:

```bash
# Ejecuta un ciclo de prueba manual
node scripts/test-execution.js
```

Verifi que:
1. ✅ Se conecta a Google Sheets
2. ✅ Apify scrapers funcionan
3. ✅ IA OpenAI genera análisis
4. ✅ Resultados se guardan correctamente

---

## 📊 Monitorear Ejecuciones

```bash
node scripts/monitor-executions.js
```

Muestra:
- 📝 Últimas ejecuciones
- 📊 Estadísticas (leads generados, duplicados, etc)
- ⏰ Próxima ejecución
- 🔴 Errores si hay

---

## 🔄 Actualizar Configuración

Después de instalar, puedes cambiar:

| Archivo | Para cambiar |
|---------|-------------|
| `credentials.json` | API Keys |
| `schedule-config.json` | Horario de ejecución |
| `target-config.json` | Client/ICP/ubicaciones |

**Cambios se aplican al siguiente schedule.**

---

## ❌ Si algo falla

Ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**¡Instalación completada! El autopilot está activo 🚀**
