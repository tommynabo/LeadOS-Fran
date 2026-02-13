# 🔧 TROUBLESHOOTING - Solución de Problemas

## ❌ Problemas Comunes

### 1. "Schedule no se ejecuta a la hora programada"

**Síntomas:**
- Configuré todo pero A las 08:30 no pasa nada
- Google Sheets no se actualiza automáticamente

**Soluciones:**

✅ **Verificar que N8N está corriendo:**
```bash
# Si usas N8N localmente
docker ps | grep n8n
# O
systemctl status n8n
```

✅ **Verificar que el Workflow está activo:**
1. Abre N8N Dashboard
2. Busca el workflow "LinkedIn Outreach Active"
3. Debe tener estado **✅ ACTIVE**

✅ **Verificar Schedule Trigger está habilitado:**
1. Click en el workflow
2. Busca el nodo "Schedule Trigger"
3. No debe tener 🔴 (deshabilitado)
4. Verifica el horario configurado

✅ **Revisar timezone:**
```bash
nano config/schedule-config.json
# Asegúrate que timezone es correcto
"timezone": "Europe/Madrid"  # Cambia si es necesario
```

✅ **Ejecutar el script de activación:**
```bash
node scripts/activate-schedule.js
```

---

### 2. "Credenciales inválidas / Error de autenticación"

**Síntomas:**
```
❌ Error: Invalid API Token
❌ Unauthorized: Google Sheets
❌ Invalid OpenAI API Key
```

**Soluciones:**

✅ **Verificar que las claves son correctas:**
```bash
# Abre credenciales
nano config/credentials.json

# Busca placeholders:
"APIFY_API_TOKEN": "apify_api_xxxxx"  ← ¿Tiene xxxxx?
```

✅ **Obtener nuevas claves:**

Para **Apify**:
1. https://console.apify.com
2. Account → Integrations
3. Copia el token COMPLETO (no cortes nada)

Para **OpenAI**:
1. https://platform.openai.com/account/api-keys
2. Create new → Copy completo
3. ⚠️ Guarda ahora, NO se mostrará de nuevo

Para **Google**:
1. Console de Google Cloud
2. Credenciales → OAuth 2.0
3. Confirma que tienes permiso: Google Sheets API

✅ **Reconectar en N8N:**
1. Abre el workflow
2. Nodos con ⚠️ → Click derecho → Edit Credentials
3. Reconecta manualmente
4. Prueba con "Execute Node"

✅ **Verificar que las APIs están ACTIVAS:**

**Apify:**
- https://console.apify.com/account/limits
- Deberías ver: "API Token: Valid"

**OpenAI:**
- https://platform.openai.com/account/billing/limits
- Verifica que tienes saldo/créditos

**Google Sheets:**
- https://console.cloud.google.com/apis/api/sheets.googleapis.com
- Estado: **ENABLED**

---

### 3. "Error en Apify / No encuentra actores"

**Síntomas:**
```
❌ Actor not found: nwua9Gu5YrADL7ZDj
❌ Apify Actor returned error
```

**Soluciones:**

✅ **Los ID de actores pueden haber cambiado.**

Actores que necesitas ("Actor ID"):
1. **Google Maps Scraper**: `nwua9Gu5YrADL7ZDj`
2. **Contact Scraper**: `vdrmO1lXCkhbPjE9j`
3. **Google Search Scraper**: `nFJndFXA5zjCTuudP`
4. **LinkedIn Posts Scraper**: `LQQIXN9Othf8f7R5n`

✅ **Verificar que los actores existen:**
1. https://console.apify.com → Actors → My Actors
2. Busca cada uno por nombre
3. Si no está: cópialo de https://apify.com/browse

✅ **Actualizar IDs en el workflow:**

Si encontraste un actor nuevo:
1. En N8N, abre el workflow
2. Busca el nodo del actor
3. Click → Edita "Actor ID"
4. Pega el nuevo ID
5. Guarda

✅ **Revisar cuota de Apify:**
```bash
# https://console.apify.com/account/limits
# Deberías ver: "Monthly credit limit: X"
```

Si dice "0" → Necesitas agregar créditos

---

### 4. "IA no genera análisis / OpenAI Error"

**Síntomas:**
```
❌ Error: OpenAI API error 401
❌ Rate limit exceeded
❌ Model gpt-4o-mini not found
```

**Soluciones:**

✅ **Verifica que tienes saldo OpenAI:**
1. https://platform.openai.com/account/billing/overview
2. Debe haber: "Credit balance: $X.XX"
3. Si es $0 → Necesitas agregar tarjeta

✅ **Verificar que el modelo existe:**
```bash
# En config, busca:
"model": "gpt-4o-mini"
# Si falla, intenta:
"model": "gpt-4o"  # O "gpt-4-turbo"
```

✅ **Rate limiting:**
Si ves: "Rate limit exceeded"
- Reduce `max_leads_per_execution` en schedule-config.json
- De 50 a 20-30

---

### 5. "Google Sheets no se actualiza"

**Síntomas:**
- El workflow se ejecuta (logs dicen "Success")
- Pero Google Sheets sigue vacía

**Soluciones:**

✅ **Verificar permisos Google:**
1. Abre tu Google Sheet
2. Click **Share** (arriba derecha)
3. Debe estar compartida con el email de N8N
4. Con permisos **Editor**

✅ **Verificar Sheet ID es correcto:**
```bash
nano config/credentials.json
# URL: https://docs.google.com/spreadsheets/d/1pUXTM6xNd...
#      Solo esta parte: 1pUXTM6xNd...
```

✅ **Verificar nombre de hojas:**
En N8N, cada nodo de Google Sheets tiene "Sheet Name"
- Debe existir en tu documento
- Ej: "PROFILE INFO", "POSTS", "COMMENTS"

Si no existen, créalas:
1. Abre tu Google Sheet
2. Click + abajo para nueva hoja
3. Nombra exactamente como aparece en N8N

---

### 6. "Demasiados duplicados / No encuentra leads nuevos"

**Síntomas:**
- La IA expresa: "80 duplicados descartados"
- Muy pocos leads nuevos

**Soluciones:**

✅ **Expande el búfer de búsqueda:**
```bash
nano services/search/SearchService.ts
# Busca:
const bufferMultiplier = 4;  # Cámbialo a 6 o 8
```

✅ **Amplía el ICP:**
```bash
nano config/target-config.json
# En "icp", añade más:
"keywords": ["keyword1", "keyword2", "keyword3"]
"locations": ["Madrid", "Barcelona", "Valencia", "Bilbao"]
```

✅ **Desactiva anti-duplicados temporalmente** (solo para debug):
```bash
# En App.tsx, busca:
let allExclusions = new Set<string>();
# Cámbia a:
let allExclusions = new Set<string>();  // Vacío
```

---

### 7. "Error: 'Cannot find module' o 'Node not found'"

**Síntomas:**
```
❌ Error: Cannot find module 'path'
❌ Node.js: command not found
```

**Soluciones:**

✅ **Instalar Node.js:**
```bash
# macOS
brew install node

# Ubuntu/Debian
sudo apt-get install nodejs npm

# Verificar
node --version
npm --version
```

✅ **Instalar dependencias:**
```bash
npm install
```

✅ **Usa node correctamente:**
```bash
# ✅ Correcto
node scripts/verify-autopilot.js

# ❌ Incorrecto
npm run verify-autopilot.js
```

---

### 8. "Timeout / Ejecución muy lenta"

**Síntomas:**
- Workflow se demora 2+ horas
- Logs dicen "TIMEOUT"

**Soluciones:**

✅ **Reduce cantidad de leads:**
```bash
nano config/schedule-config.json
# Cambiar:
"max_leads_per_execution": 50  →  20-30
```

✅ **Reduce profundidad de análisis:**
```bash
nano config/target-config.json
# En cada plataforma:
"depth": 10  →  5
"max_results": 20  →  10
```

✅ **Desactiva análisis profundo:**
```bash
nano services/search/SearchService.ts
# Busca "deepResearchLead" y comenta TODO su contenido
# O en config:
"ai_analysis": {
  "enabled": false  ← Cambiar a false
}
```

✅ **Increase timeout en N8N:**
1. Abre workflow
2. Click el botón de Play (arriba)
3. Busca "Timeout" 
4. Aumenta a 1800 segundos (30 min)

---

### 9. "Workflow no aparece en N8N"

**Síntomas:**
- Importé el JSON pero no lo veo en N8N

**Soluciones:**

✅ **Verifica que se importó correctamente:**
1. En N8N → **Workflows**
2. Busca "LinkedIn Outreach"
3. Si no está → vuelve a importar

✅ **Importar nuevamente:**
1. Click **+ New**
2. **Import from file**
3. Selecciona: `n8n-workflows/linkedin-outreach-active.json`

✅ **Si dice "JSON invalid":**
- Verifica que el archivo existe: `ls n8n-workflows/linkedin-outreach-active.json`
- El archivo puede estar corrupto, reemplázalo

---

### 10. "Seguridad / Credenciales expuestas"

⚠️ **RIESGO DE SEGURIDAD**

**Si accidentalmente hiciste commit con credenciales:**

✅ **Inmediatamente:**
1. Invalida todos los tokens:
   - https://console.apify.com → Regenerate token
   - https://platform.openai.com/account/api-keys → Delete key

2. Crea nuevos tokens:
   - Obtén nuevos según procedimiento
   - Actualiza `credentials.json`

3. Limpia el Git:
```bash
# Borra el archivo del historio
git rm --cached config/credentials.json

# Añade a .gitignore
echo "config/credentials.json" >> .gitignore

# Commit
git commit -m "Remove credentials from history"

# Force push (CUIDADO)
git push --force
```

✅ **Prevenir futuro:**
```bash
# Asegúrate .gitignore tiene:
config/credentials.json
.env
.env.local
```

---

## 🆘 Si nada funciona

**Haz esto en orden:**

1. **Hard reset / Empezar de nuevo:**
```bash
cd AutopilotScheduler
node scripts/rollback.js
node scripts/install-autopilot.js
node scripts/verify-autopilot.js
```

2. **Verificar logs en N8N:**
- Abre el workflow
- Click **Executions** (arriba)
- Busca eventos recientes
- Lee el error detallado

3. **Test manual:**
```bash
node scripts/test-execution.js
```

4. **Contacta soporte:**
- Apify: https://apify.com/support
- OpenAI: https://help.openai.com
- N8N: https://community.n8n.io

---

**¿Más ayuda? Crea un issue en el repositorio 📝**
