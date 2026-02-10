#!/bin/bash

# ============================================================================
# Email Discovery Pipeline - Smart Integration Script
# ============================================================================
# Este script integra automáticamente el sistema de descubrimiento de emails
# en cualquier proyecto, detectando si es búsqueda genérica o sector-específica
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Email Discovery Pipeline - Smart Integration Setup       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# PASO 1: Detectar la estructura del proyecto
# ============================================================================
echo -e "${YELLOW}[1/4]${NC} Detectando estructura del proyecto..."

PROJECT_ROOT=$(pwd)
SERVICE_DIR=""

# Buscar el directorio de servicios
if [ -d "src/services" ]; then
    SERVICE_DIR="src/services"
elif [ -d "services" ]; then
    SERVICE_DIR="services"
else
    echo -e "${RED}❌ No se encontró directorio de servicios (services/ o src/services/)${NC}"
    exit 1
fi

echo -e "${GREEN}✅${NC} Directorio de servicios: ${SERVICE_DIR}/"

# ============================================================================
# PASO 2: Detectar tipo de búsqueda (genérica o sector-específica)
# ============================================================================
echo ""
echo -e "${YELLOW}[2/4]${NC} Detectando tipo de búsqueda..."

SEARCH_TYPE=""
SEARCH_SERVICE=""

# Buscar archivos de servicio
if [ -f "${SERVICE_DIR}/search/SearchService.ts" ]; then
    SEARCH_SERVICE="${SERVICE_DIR}/search/SearchService.ts"
elif [ -f "${SERVICE_DIR}/searchService.ts" ]; then
    SEARCH_SERVICE="${SERVICE_DIR}/searchService.ts"
fi

if [ -n "$SEARCH_SERVICE" ]; then
    # Analizar el archivo para detectar patrón
    if grep -q "sector\|Sector\|SECTOR\|industry\|Industry\|vertical" "$SEARCH_SERVICE" 2>/dev/null; then
        SEARCH_TYPE="sector-specific"
        echo -e "${GREEN}✅${NC} Detectado: Búsqueda específica por sector/industria"
    elif grep -q "generic\|genericSearch\|googleMaps\|businessName" "$SEARCH_SERVICE" 2>/dev/null; then
        SEARCH_TYPE="generic"
        echo -e "${GREEN}✅${NC} Detectado: Búsqueda genérica"
    else
        SEARCH_TYPE="unknown"
        echo -e "${YELLOW}⚠️${NC}  No se pudo detectar automáticamente"
    fi
else
    SEARCH_TYPE="unknown"
    echo -e "${YELLOW}⚠️${NC}  No se encontró SearchService"
fi

# Si no se detectó, preguntar al usuario
if [ "$SEARCH_TYPE" = "unknown" ]; then
    echo ""
    echo -e "${YELLOW}Responde para configurar la integración:${NC}"
    echo "  [g] Búsqueda genérica (pymes, negocios variados)"
    echo "  [s] Búsqueda sector-específica (un sector/industria definida)"
    read -p "Tipo de búsqueda (g/s): " choice
    
    if [ "$choice" = "s" ] || [ "$choice" = "S" ]; then
        SEARCH_TYPE="sector-specific"
        echo -e "${GREEN}✅${NC} Configurado: Búsqueda sector-específica"
    else
        SEARCH_TYPE="generic"
        echo -e "${GREEN}✅${NC} Configurado: Búsqueda genérica"
    fi
fi

# ============================================================================
# PASO 3: Verificar que emailDiscovery existe
# ============================================================================
echo ""
echo -e "${YELLOW}[3/4]${NC} Verificando instalación de Email Discovery..."

if [ ! -d "${SERVICE_DIR}/emailDiscovery" ]; then
    echo -e "${RED}❌ Error: emailDiscovery no se encuentra en ${SERVICE_DIR}/emailDiscovery/${NC}"
    echo ""
    echo -e "${YELLOW}Instrucciones:${NC}"
    echo "1. Copia la carpeta 'emailDiscovery' a: ${SERVICE_DIR}/emailDiscovery/"
    echo "2. Luego ejecuta este script nuevamente"
    exit 1
fi

echo -e "${GREEN}✅${NC} emailDiscovery instalado en: ${SERVICE_DIR}/emailDiscovery/"

# Verificar archivos críticos
CRITICAL_FILES=(
    "${SERVICE_DIR}/emailDiscovery/index.ts"
    "${SERVICE_DIR}/emailDiscovery/config.ts"
    "${SERVICE_DIR}/emailDiscovery/types.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Archivo faltante: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅${NC} Todos los archivos críticos presentes"

# ============================================================================
# PASO 4: Generar integración específica
# ============================================================================
echo ""
echo -e "${YELLOW}[4/4]${NC} Generando integración para búsqueda ${SEARCH_TYPE}..."

if [ "$SEARCH_TYPE" = "sector-specific" ]; then
    # Integración para sector-específico
    cat > "${SERVICE_DIR}/emailDiscovery/INTEGRATION_DONE.txt" << 'EOF'
=== INTEGRACIÓN EMAIL DISCOVERY - SECTOR ESPECÍFICO ===

Tipo de búsqueda detectado: SECTOR-ESPECÍFICO

Esto significa que tu proyecto busca empresas dentro de un sector/industria específico.

PASOS PARA INTEGRAR:

1. En tu servicio de búsqueda (SearchService, SectorSearchService, etc):

   // al inicio del archivo:
   import { 
     emailDiscoveryPipeline,
     type EmailDiscoveryResult,
     type CompanyData 
   } from '../emailDiscovery';

2. Cuando obtengas resultados de búsqueda por sector, para cada empresa:

   // Convertir data al formato esperado
   const companyData: CompanyData = {
     name: company.name,
     website: company.website || `https://${company.domain}`,
     industry: sectorName, // tu sector/industria
     location: company.location || company.country
   };

   // Descubrir email
   const emailResult = await emailDiscoveryPipeline.discoverOwnerEmail(
     companyData,
     (log) => {
       console.log(`[${log.source}] ${log.message}`);
     }
   );

   if (emailResult) {
     company.ownerEmail = emailResult.email;
     company.ownerName = emailResult.ownerName;
     company.emailSource = emailResult.source;
     company.emailConfidence = emailResult.confidence;
   }

3. Asegúrate de tener las credenciales en .env.local:
   - VITE_GOOGLE_API_KEY
   - VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID  
   - VITE_OPENAI_API_KEY
   - VITE_APIFY_API_TOKEN
   - (Y los IDs de actores de Apify)

4. La pipeline se ejecutará automáticamente en cascada y entregará:
   - email (string)
   - ownerName (string)
   - source (string - qué método encontró el email)
   - confidence (0-1 - qué tan seguro estamos)

=== LISTO PARA USAR ===
EOF
    echo -e "${GREEN}✅${NC} Integración sector-específica configurada"

else
    # Integración para búsqueda genérica
    cat > "${SERVICE_DIR}/emailDiscovery/INTEGRATION_DONE.txt" << 'EOF'
=== INTEGRACIÓN EMAIL DISCOVERY - BÚSQUEDA GENÉRICA ===

Tipo de búsqueda detectado: GENÉRICA

Esto significa que tu proyecto busca empresas sin restricción de sector.

PASOS PARA INTEGRAR:

1. En SearchService.ts (o tu servicio principal):

   // al inicio del archivo:
   import { 
     emailDiscoveryPipeline,
     type EmailDiscoveryResult,
     type CompanyData 
   } from '../emailDiscovery';

2. Después de obtener resultados de búsqueda genérica (Google Maps, etc):

   // Para cada empresa encontrada:
   const companyData: CompanyData = {
     name: result.name,
     website: result.website,
     industry: result.type || 'unknown', // categoría/tipo
     location: result.location
   };

   // Descubrir email del dueño
   const emailResult = await emailDiscoveryPipeline.discoverOwnerEmail(
     companyData,
     (log) => {
       // Opcional: loguear el progreso
       console.log(`[${log.source}] ${log.message}`);
     }
   );

   if (emailResult) {
     result.ownerEmail = emailResult.email;
     result.ownerName = emailResult.ownerName;
     result.source = emailResult.source;
   }

3. Variables de entorno requeridas en .env.local:
   VITE_GOOGLE_API_KEY=your_key
   VITE_GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_cse_id
   VITE_OPENAI_API_KEY=your_openai_key
   VITE_APIFY_API_TOKEN=your_apify_token

4. La pipeline intenta 7 métodos en cascada:
   1. LinkedIn (Company Pages)
   2. Google Dorks (búsqueda avanzada)
   3. Website scraping + AI
   4. Email pattern generation
   5. WHOIS lookup
   6. Twitter/X search
   7. SMTP validation

5. Retorna el email más confiable encontrado en la primera línea:
   {
     email: "founder@company.com",
     ownerName: "John Doe",
     source: "apify_linkedin",
     confidence: 0.85
   }

=== LISTO PARA USAR ===
EOF
    echo -e "${GREEN}✅${NC} Integración genérica configurada"
fi

# ============================================================================
# RESUMEN FINAL
# ============================================================================
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ INTEGRACIÓN COMPLETADA                               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Próximos pasos:${NC}"
echo "1. Lee: ${SERVICE_DIR}/emailDiscovery/INTEGRATION_DONE.txt"
echo "2. Abre: ${SERVICE_DIR}/emailDiscovery/README.md (para documentación completa)"
echo "3. Integra en tu SearchService/servicio principal"
echo ""
echo -e "${YELLOW}Verificación de credenciales:${NC}"
echo "   - Ejecuta: npm run validate"
echo "   - O lee: ${SERVICE_DIR}/emailDiscovery/MANIFEST.md"
echo ""
echo -e "${BLUE}¿Preguntas?${NC} Revisa: ${SERVICE_DIR}/emailDiscovery/README.md"
echo ""
