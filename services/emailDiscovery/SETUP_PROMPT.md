# 🎯 COPIA Y PEGA - Setup Email Discovery en 2do Proyecto

---

## 📦 NOMBRE DE LA CARPETA A COPIAR

```
services/emailDiscovery/
```

---

## 🔗 RUTA COMPLETA DEL PROYECTO ACTUAL

```
/Users/tomas/Downloads/DOCUMENTOS/LeadOS - Regist/services/emailDiscovery/
```

---

## 🖥️ COMANDOS EXACTOS (ELIGE UNO)

### Opción A: Si el segundo proyecto está en otra carpeta
```bash
# 1. Reemplaza /ruta/tu-segundo-proyecto con la ruta real
cd /ruta/tu-segundo-proyecto

# 2. Copia la carpeta
cp -r /Users/tomas/Downloads/DOCUMENTOS/"LeadOS - Regist"/services/emailDiscovery ./services/

# 3. Ejecuta setup (elige según tu tipo de búsqueda)
bash services/emailDiscovery/integrate.sh
```

### Opción B: Si todo está en el mismo sitio
```bash
cd ~/Downloads/DOCUMENTOS/

# Si el segundo proyecto es "LeadOS - Diego":
cp -r "LeadOS - Regist"/services/emailDiscovery "LeadOS - Diego"/services/

# Luego integra:
cd "LeadOS - Diego"
bash services/emailDiscovery/integrate.sh
```

---

## ❓ CUANDO TE PREGUNTE "Tipo de búsqueda":

### Responde `s` si:
- Buscas empresas en UN SECTOR específico
- Por ejemplo: "todas las inmobiliarias de Barcelona"
- Ej: sectores, industrias específicas, nichos

```bash
s
```

### Responde `g` si:
- Buscas empresas de CUALQUIER SECTOR
- Por ejemplo: "todas las pymes de Barcelona"
- Ej: búsqueda genérica, múltiples industrias

```bash
g
```

---

## ✅ QUÉ PASA AL EJECUTAR `bash services/emailDiscovery/integrate.sh`

El script automáticamente:

1. ✅ Detecta tu estructura (`/services` o `/src/services`)
2. ✅ Busca si es búsqueda sector-específica o genérica
3. ✅ Verifica que la carpeta `emailDiscovery` esté correctamente copiada
4. ✅ Comprueba archivos críticos (15 archivos necesarios)
5. ✅ Genera `INTEGRATION_DONE.txt` con **instrucciones personalizadas**
6. ✅ Te muestra qué código agregar a tu SearchService

---

## 📄 ARCHIVOS GENERADOS

Después de ejecutar el script, verás esto:

```
services/emailDiscovery/
├── INTEGRATION_DONE.txt  ⭐ LÉELO PRIMERO (tiene tu codigo específico)
├── integrate.sh          (el script que acabas de ejecutar)
├── COPY_PASTE_SETUP.md   (este archivo, pero en tu proyecto)
├── README.md             (documentación completa)
├── config.ts             (configuración, necesita credenciales)
├── types.ts
├── index.ts
├── (11 archivos más de servicios)
└── ...
```

---

## 🚀 RESUMEN VISUAL

```
┌─────────────────────────────────────────────────────────┐
│ Terminal en raíz de tu 2do proyecto:                    │
│                                                          │
│ $ cd /ruta/tu-segundo-proyecto                          │
│ $ cp -r /ruta/proyecto1/services/emailDiscovery ./svc/  │
│ $ bash services/emailDiscovery/integrate.sh             │
│ → Responde: s o g                                       │
│ → ✅ Listo! Leer INTEGRATION_DONE.txt                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎬 AFTER: QUÉ HACER DESPUÉS

1. Lee: `services/emailDiscovery/INTEGRATION_DONE.txt`
2. Abre: `services/search/SearchService.ts` (o tu servicio principal)
3. Copia el codigo que te menciona `INTEGRATION_DONE.txt`
4. Agrega credenciales a `.env.local`:
   ```
   VITE_GOOGLE_API_KEY=...
   VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID=...
   VITE_OPENAI_API_KEY=...
   VITE_APIFY_API_TOKEN=...
   ```
5. Prueba tu proyecto

---

## 🛠️ TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| "No se encontró directorio de servicios" | Verifica que existe `services/` o `src/services/` |
| "emailDiscovery no se encuentra" | Asegúrate de copiar la carpeta correctamente |
| Script congela en pregunta de tipo | Presiona Enter después de escribir `s` o `g` |
| Error de permisos | Ejecuta: `chmod +x services/emailDiscovery/integrate.sh` |

---

**¿Listo?** Copia el comando de arriba y pégalo en terminal. 🚀

