# 📋 INSTRUCCIONES - Copia y Pega para el Segundo Proyecto

## Resumen Ultra Rápido

**Carpeta a copiar:** `services/emailDiscovery/`  
**Comando a ejecutar:** Ver abajo según si es sector-específico o genérico

---

## Paso 1️⃣ : Copiar la Carpeta

Desde tu proyecto **ACTUAL** (LeadOS - Regist), copia esta carpeta:

```
services/emailDiscovery/
```

Pégala en tu **SEGUNDO PROYECTO** en la misma ubicación:

```
tu-proyecto-2/
├── services/
│   └── emailDiscovery/     ← AQUÍ VA
│
```

---

## Paso 2️⃣ : Ejecutar el Comando de Integración

Abre terminal en la **raíz del segundo proyecto** y ejecuta **UNO** de estos comandos.

### 🔍 Si es búsqueda SECTOR-ESPECÍFICA:

```bash
bash services/emailDiscovery/integrate.sh
# Selecciona: [s] cuando te pregunte
```

**Responde:**
- ¿Tipo de búsqueda?: `s` (sector-específica)

### 📊 Si es búsqueda GENÉRICA:

```bash
bash services/emailDiscovery/integrate.sh
# Selecciona: [g] cuando te pregunte
```

**Responde:**
- ¿Tipo de búsqueda?: `g` (genérica)

---

## Paso 3️⃣ : Seguir las instrucciones

El script automáticamente:

✅ Detectará tu estructura de proyecto  
✅ Identificará el tipo de búsqueda  
✅ Generará `INTEGRATION_DONE.txt` con instrucciones específicas  
✅ Te dirá qué hacer en tu `SearchService`  

---

## 📌 Ejemplo Completo

**Si tu segundo proyecto está en:** `/Users/tomas/OtroProjeto`

### Terminal:
```bash
# 1. Navega a tu proyecto
cd /Users/tomas/OtroProjeto

# 2. Copia la carpeta (desde tu proyecto actual)
cp -r /Users/tomas/Downloads/DOCUMENTOS/"LeadOS - Regist"/services/emailDiscovery ./services/

# 3. Ejecuta el setup
bash services/emailDiscovery/integrate.sh

# 4. Responde según tu tipo de búsqueda (s o g)
```

---

## 🎯 Qué hace el script:

| Paso | Acción |
|------|---------|
| 1️⃣ | Detecta `/services` o `/src/services` |
| 2️⃣ | Analiza tu código para detectar sector-específico vs genérico |
| 3️⃣ | Verifica que `emailDiscovery` esté copiado correctamente |
| 4️⃣ | Genera `INTEGRATION_DONE.txt` con instrucciones customizadas |
| 5️⃣ | Te dice exactamente qué código agregar a tu SearchService |

---

## 📄 Archivos Clave tras Integración

El script genera:

```
services/emailDiscovery/
├── INTEGRATION_DONE.txt  ← ⭐ LEER ESTO PRIMERO (instrucciones específicas)
├── README.md             ← Documentación completa
├── config.ts             ← Credenciales necesarias
└── ... (13 archivos de código)
```

---

## ❓ Si algo no funciona:

### 1. El script no encuentra emailDiscovery:
```bash
# Verifica que la carpeta esté en el lugar correcto
ls -la services/emailDiscovery/

# Si no existe, cópila:
cp -r /ruta/al/proyecto-actual/services/emailDiscovery ./services/
```

### 2. El script no detecta el tipo de búsqueda:
- Te pedirá que respondas: `[g]` para genérica o `[s]` para sector-específica
- Elige la que corresponda a tu proyecto

### 3. Falta credenciales:
```bash
# Después de que el script termine, abre .env.local y agrega:
VITE_GOOGLE_API_KEY=tu_clave
VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID=tu_id
VITE_OPENAI_API_KEY=tu_clave
VITE_APIFY_API_TOKEN=tu_token
```

---

## ✅ Checklist Final

Después de ejecutar el script:

- [ ] Se creó `services/emailDiscovery/INTEGRATION_DONE.txt`
- [ ] Leíste las instrucciones en ese archivo
- [ ] Agregaste la línea de import en tu SearchService
- [ ] Agregaste el código de descubrimiento en tu lógica
- [ ] Agregaste credenciales a `.env.local`
- [ ] Hiciste `npm install` (si es necesario)
- [ ] Prueba: ejecuta tu proyecto y busca empresas

---

## 🚀 Comando Rápido (Todo-en-Uno)

Si ya copiastes la carpeta y quieres integrar de una vez:

```bash
cd /ruta/tu-proyecto-2 && bash services/emailDiscovery/integrate.sh
```

---

## 📞 Soporte

- Lee: `services/emailDiscovery/README.md` (documentación completa)
- Lee: `services/emailDiscovery/INTEGRATION_EXAMPLE.md` (ejemplos de código)
- Lee: `services/emailDiscovery/MANIFEST.md` (estructura del proyecto)

