# 📋 CÓMO ADAPTAR EL AUTOPILOT A TODOS LOS SISTEMAS

## PASO A PASO VISUAL

```
├─ PASO 1: Copiar AutopilotScheduler
│  └─ cp -r AutopilotScheduler /ruta/cada/proyecto/
│
├─ PASO 2: Leer config/project.ts del proyecto
│  └─ Para obtener: clientName, ICP, enabledPlatforms, locations
│
├─ PASO 3: Personalizar config/target-config.json
│  └─ Crear template con datos del cliente
│
├─ PASO 4: Editar config/credentials.json
│  └─ Agregar API Keys (igual para todos)
│
└─ PASO 5: Activar
   └─ node scripts/activate-schedule.js
```

---

## 🎯 PASO 1: COPIAR LA CARPETA

Copia `AutopilotScheduler` a cada proyecto:

```bash
# Para LeadOS - Fran
cp -r /Users/tomas/Downloads/DOCUMENTOS/AutopilotScheduler \
      /Users/tomas/Downloads/DOCUMENTOS/LeadOS\ -\ Fran/

# Para LeadOS - Regist
cp -r /Users/tomas/Downloads/DOCUMENTOS/AutopilotScheduler \
      /Users/tomas/Downloads/DOCUMENTOS/LeadOS\ -\ Regist/

# Para LeadOS - Diego
cp -r /Users/tomas/Downloads/DOCUMENTOS/AutopilotScheduler \
      /Users/tomas/Downloads/DOCUMENTOS/LeadOS\ -\ Diego/
```

---

## 📖 PASO 2: LEER config/project.ts

Cada proyecto tiene su `config/project.ts` con:
- **clientName**: Nombre del cliente
- **ICP**: Ideal Customer Profile (descripción)
- **enabledPlatforms**: Qué plataformas usar (linkedin, gmail)
- **locations**: Ciudades a buscar
- **primaryColor**: Color del proyecto

**Ejemplo LeadOS - Fran:**
```typescript
{
  clientName: 'REGIST',
  icp: 'Gimnasios, Centros de Crossfit y Estudios de Yoga que necesitan más clientes',
  enabledPlatforms: ['gmail', 'linkedin'],
  locations: ['Madrid', 'Barcelona', 'Valencia']
}
```

---

## 🎯 PASO 3: PERSONALIZAR target-config.json

Edita `AutopilotScheduler/config/target-config.json`:

```bash
cd /ruta/proyecto/AutopilotScheduler
nano config/target-config.json
```

Reemplaza el template activo con datos del cliente:

```json
{
  "active_target": "template_fran",
  "base_templates": {
    "template_fran": {
      "client_id": "cli_fran_001",
      "client_name": "LeadOS - Fran",
      "description": "Gimnasios y estudios de yoga buscando más clientes",
      
      "icp": {
        "roles": ["Owner", "Manager", "Director"],
        "industries": ["Fitness", "Yoga", "Crossfit", "Wellness"],
        "keywords": ["más clientes", "membresías", "inscripciones"]
      },
      
      "locations": ["Madrid", "Barcelona", "Valencia"],
      
      "platforms": {
        "linkedin": {
          "enabled": true,
          "search_mode": "fast",
          "depth": 10,
          "max_results": 20
        },
        "gmail": {
          "enabled": true,
          "search_mode": "fast",
          "depth": 5,
          "max_results": 30
        }
      }
    }
  }
}
```

---

## 🔐 PASO 4: CREDENCIALES (Una sola vez)

Las credenciales son **iguales para todos los sistemas**:

```bash
nano config/credentials.json
```

Edita UNA sola vez con tus keys:
```json
{
  "APIFY_API_TOKEN": "apify_api_xxxxx",
  "OPENAI_API_KEY": "sk-proj-xxxxx",
  "GOOGLE_SHEETS_ID": "tu_sheet_id"
}
```

Luego simplemente **copia este mismo archivo** a todos los demás proyectos AutopilotScheduler.

---

## ✅ PASO 5: ACTIVAR EN CADA PROYECTO

```bash
# En LeadOS - Fran
cd /Users/tomas/Downloads/DOCUMENTOS/LeadOS\ -\ Fran/AutopilotScheduler
node scripts/install-autopilot.js
node scripts/verify-autopilot.js
node scripts/activate-schedule.js

# En LeadOS - Regist
cd /Users/tomas/Downloads/DOCUMENTOS/LeadOS\ -\ Regist/AutopilotScheduler
node scripts/install-autopilot.js
node scripts/verify-autopilot.js
node scripts/activate-schedule.js

# En LeadOS - Diego
cd /Users/tomas/Downloads/DOCUMENTOS/LeadOS\ -\ Diego/AutopilotScheduler
node scripts/install-autopilot.js
node scripts/verify-autopilot.js
node scripts/activate-schedule.js
```

---

## 📝 PROMPT PARA ADAPTAR EL CÓDIGO

Si necesitas que alguien (o una IA) adapte el autopilot automáticamente, usa este prompt:

```
PROMPT PARA COPILOT/CLAUDE:

Voy a darte un sistema de AutopilotScheduler que necesito adaptar a diferentes 
proyectos de LeadOS. 

CONTEXTO:
- Tengo una carpeta source: /Users/tomas/Downloads/DOCUMENTOS/AutopilotScheduler/
- Necesito copiarla a 3 proyectos:
  1. LeadOS - Fran (Gimnasios/Yoga)
  2. LeadOS - Regist (Fitness/Crossfit)
  3. LeadOS - Diego (CEOs/CTOs/Decisores)

TAREA:
1. Copia AutopilotScheduler a cada proyecto
2. Lee el config/project.ts de cada proyecto
3. Personaliza AutopilotScheduler/config/target-config.json con:
   - clientName (del proyecto)
   - icp (Ideal Customer Profile)
   - enabledPlatforms (del proyecto)
   - locations (del proyecto)
   - roles y keywords apropiados

DATOS DE ENTRADA:

LeadOS - Fran:
- clientName: "LeadOS - Fran"
- icp: "Gimnasios, Centros de Crossfit y Estudios de Yoga"
- enabledPlatforms: ["gmail", "linkedin"]
- locations: ["Madrid", "Barcelona", "Valencia"]

LeadOS - Regist:
- clientName: "LeadOS - Regist"
- icp: "Gimnasios, Centros de Crossfit"
- enabledPlatforms: ["gmail", "linkedin"]
- locations: ["Madrid", "Barcelona", "Valencia"]

LeadOS - Diego:
- clientName: "LeadOS - Diego"
- icp: "CEOs, Founders, CTOs, Directivos, Tomadores de decisiones"
- enabledPlatforms: ["linkedin"]
- locations: ["Madrid", "Barcelona", "Valencia"]

SALIDA ESPERADA:
- AutopilotScheduler copiado en cada carpeta
- Cada uno con su target-config.json personalizado
- Listos para ejecutar: npm run activate
```

---

## 🚀 RESUMEN RÁPIDO

| Proyecto | Carpeta | ICP | Plataformas |
|----------|---------|-----|-------------|
| LeadOS - Fran | `./AutopilotScheduler/` | Fitness/Yoga | Gmail + LinkedIn |
| LeadOS - Regist | `./AutopilotScheduler/` | Fitness/Crossfit | Gmail + LinkedIn |
| LeadOS - Diego | `./AutopilotScheduler/` | CTOs/Founders | LinkedIn only |

Cada uno se ejecutará a las **08:30** con su ICP diferente.

---

## ✨ CHECKLIST

- [ ] Copiar AutopilotScheduler a Fran
- [ ] Copiar AutopilotScheduler a Regist
- [ ] Copiar AutopilotScheduler a Diego
- [ ] Personalizar target-config.json en cada uno
- [ ] Copiar credentials.json igual en todos (1x)
- [ ] Ejecutar install-autopilot.js en cada uno
- [ ] Ejecutar verify-autopilot.js en cada uno
- [ ] Ejecutar activate-schedule.js en cada uno
- [ ] Verificar que N8N importó los 3 workflows

---

**¡Listo! Tendrás 3 pilotos automáticos ejecutándose en paralelo a las 08:30 cada día** 🚀
