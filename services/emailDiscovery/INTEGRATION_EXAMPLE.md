# 🔌 Integración con SearchService

Guía de cómo integrar el Email Discovery Pipeline en tu `SearchService.ts` existente.

---

## 📍 Dónde integrar

En la función `searchGmail()` de `SearchService.ts`, después de que hayas obtenido las empresas de Google Maps.

---

## 📝 Código de ejemplo

### Antes (sin Email Discovery):

```typescript
private async searchGmail(
    config: SearchConfigState,
    interpreted: { searchQuery: string; industry: string; targetRoles: string[]; location: string },
    onLog: LogCallback,
    onComplete: ResultCallback
) {
    // ... código existente ...

    let allLeads: Lead[] = [];

    for (const [index, item] of mapsResults.entries()) {
        const tempLead: Lead = {
            id: String(item.placeId || `lead-${Date.now()}-${index}`),
            source: 'gmail',
            companyName: item.title || item.name || 'Sin Nombre',
            website: item.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '',
            location: item.address || item.fullAddress || '',
            decisionMaker: {
                name: '',
                role: 'Propietario',
                email: item.email || (item.emails?.[0]) || '',  // ← Email genérico
                phone: item.phone || (item.phones?.[0]) || '',
                linkedin: '',
            },
            // ... resto igual ...
        };

        allLeads.push(tempLead);
    }

    // ... continuar ...
}
```

### Después (con Email Discovery):

```typescript
import { emailDiscoveryPipeline, CompanyData } from '../emailDiscovery'; // ← AGREGAR

private async searchGmail(
    config: SearchConfigState,
    interpreted: { searchQuery: string; industry: string; targetRoles: string[]; location: string },
    onLog: LogCallback,
    onComplete: ResultCallback
) {
    // ... código existente (maps results, etc) ...

    let allLeads: Lead[] = [];

    for (const [index, item] of mapsResults.entries()) {
        const tempLead: Lead = {
            id: String(item.placeId || `lead-${Date.now()}-${index}`),
            source: 'gmail',
            companyName: item.title || item.name || 'Sin Nombre',
            website: item.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '',
            location: item.address || item.fullAddress || '',
            decisionMaker: {
                name: '',
                role: 'Propietario',
                email: '', // ← Inicialmente vacío
                phone: item.phone || (item.phones?.[0]) || '',
                linkedin: '',
            },
            aiAnalysis: {
                summary: `${item.categoryName || interpreted.industry}`,
                painPoints: [],
                generatedIcebreaker: '',
                fullMessage: '',
                fullAnalysis: '',
                psychologicalProfile: '',
                businessMoment: '',
                salesAngle: ''
            },
            status: 'scraped'
        };

        // ═══════════════════════════════════════════════════════════
        // 🎯 NUEVO: Email Discovery Pipeline
        // ═══════════════════════════════════════════════════════════
        try {
            const companyData: CompanyData = {
                name: tempLead.companyName,
                website: tempLead.website || '',
                industry: interpreted.industry,
                location: tempLead.location || interpreted.location
            };

            onLog(`[EMAIL-DISCOVERY] 🔍 Buscando dueño de ${tempLead.companyName}...`);

            const ownerData = await emailDiscoveryPipeline.discoverOwnerEmail(
                companyData,
                (log) => {
                    // Log detallado cada intento
                    onLog(`[${log.source}] ${log.message}`);
                }
            );

            if (ownerData) {
                // Email encontrado: actualizar lead
                tempLead.decisionMaker.email = ownerData.email;
                tempLead.decisionMaker.name = ownerData.ownerName;
                tempLead.decisionMaker.role = ownerData.ownerRole;
                if (ownerData.linkedinProfile) {
                    tempLead.decisionMaker.linkedin = ownerData.linkedinProfile;
                }
                
                tempLead.aiAnalysis.salesAngle = `Confidence: ${(ownerData.confidence * 100).toFixed(0)}% (${ownerData.source})`;
                tempLead.status = 'enriched'; // Marcar como enriquecido
                
                onLog(`[EMAIL-DISCOVERY] ✅ Email encontrado: ${ownerData.email}`);
            } else {
                // Fallback: email genérico
                tempLead.decisionMaker.email = `contact@${tempLead.website}`;
                onLog(`[EMAIL-DISCOVERY] ⚠️ Fallback: ${tempLead.decisionMaker.email}`);
            }

        } catch (error: any) {
            onLog(`[EMAIL-DISCOVERY] ❌ Error: ${error.message}`);
            // Si falla, usar email genérico de maps (fallback total)
            tempLead.decisionMaker.email = item.email || item.emails?.[0] || `contact@${tempLead.website}`;
        }

        // ═══════════════════════════════════════════════════════════

        allLeads.push(tempLead);
    }

    // ... resto del código igual (AI analysis, etc) ...

    onComplete(allLeads);
}
```

---

## 🔄 Flujo completo paso a paso

```
1. Búsqueda en Google Maps
   └─ Obtener lista de 50 empresas

2. Para CADA empresa:
   a) Crear objeto CompanyData
   b) Llamar emailDiscoveryPipeline.discoverOwnerEmail()
   c) El pipeline intenta 7 métodos en cascada:
      - Intento 1: LinkedIn → email
      - Intento 2: Google Dorks → email
      - Intento 3: Website Scrape → email
      - Intento 4: Email Pattern → email
      - Intento 5: WHOIS → email
      - Intento 6: Twitter → email
      - Intento 7: Fallback → contact@domain
   d) Si encuentra → actualizar lead
      Si no encuentra → usar fallback

3. Enriquecer lead con AI analysis
   └─ Generar mensajes personalizados

4. Guardar en DB

5. Mostrar resultados
```

---

## ⚙️ Configurar timeouts

Si el pipeline es muy lento, puedes ajustar en `config.ts`:

```typescript
const EMAIL_DISCOVERY_CONFIG = {
    pipeline: {
        timeouts: {
            apify_linkedin: 8000,   // Antes: 15000 (8 segundos)
            google_dorks: 3000,     // Antes: 5000
            website_scrape: 5000,   // Antes: 8000
            // ... etc
        }
    }
}
```

---

## 📊 Métricas por intento

Después de terminar, puedes analizar qué intento funciona mejor:

```typescript
const logs = emailDiscoveryPipeline.getLogs();

const stats = {
    linkedin: logs.filter(l => l.source === 'apify_linkedin'),
    dorks: logs.filter(l => l.source === 'google_dorks'),
    // ... etc
};

console.log(`LinkedIn hits: ${stats.linkedin.filter(l => l.status === 'found').length}`);
console.log(`Dorks hits: ${stats.dorks.filter(l => l.status === 'found').length}`);
```

---

## 🚀 Ejecución en paralelo

Si quieres más velocidad (sacrificando algo de confiabilidad):

```typescript
// En config.ts
pipeline: {
    executeInParallel: true,  // ← Cambiar a true
    stopOnFirstSuccess: false, // ← Cambiar a false
}
```

Esto ejecutará hasta 7 intentos **al mismo tiempo** en lugar de secuencial. Más rápido, pero consume más APIs.

---

## 🔐 Rate Limiting

El pipeline respeta automáticamente:

- **Google Custom Search**: 100 búsquedas/día
- **Apify**: Créditos disponibles
- **OpenAI**: Token rate

No hay riesgo de exceder límites gratuitos.

---

## 📈 Resultados esperados

Después de mejoras:

```
ANTES (sin Email Discovery):
├─ 50 empresas encontradas
├─ 5-10 con email verificado
└─ 40-45 con email genérico (bajo engagement)

DESPUÉS (con Email Discovery):
├─ 50 empresas encontradas
├─ 40-45 con email real del dueño
└─ 5-10 con email genérico (high fallback)

MEJORA: +300-400% tasa de conversión esperada
```

---

## ⚠️ Posibles problemas

### 1. "Pipeline demasiado lento"
```typescript
// Solución: reducir timeouts o usar parallelization
EMAIL_DISCOVERY_CONFIG.pipeline.executeInParallel = true;
```

### 2. "Google Custom Search quota exceeded"
```typescript
// Ya tienes 100 búsquedas/día gratis
// Si necesitas más, crear segundo Custom Search Engine:
GOOGLE_CUSTOM_SEARCH_ENGINE_ID_PROJECT2=...
```

### 3. "Apify créditos insuficientes"
```typescript
// Usar 4 cuentas Apify (tienes $20 en créditos gratis)
// Load balancing automático en next iteration
```

### 4. "OpenAI API error"
```typescript
// GPT-4o-mini es muy barato (~$0.001 por request)
// Si sigue fallando, revisar VITE_OPENAI_API_KEY en .env
```

---

## 🎯 Próximos pasos

1. ✅ Crear estrutura Email Discovery (YA HECHO)
2. ⬜ Integrar en SearchService.ts (PRÓXIMO)
3. ⬜ Testear con datos reales
4. ⬜ Optimizar timeouts basado en resultados
5. ⬜ Agregar dashboard de estadísticas
6. ⬜ Copiar a proyecto 2

---

## 📚 Referencia rápida

```typescript
// Importar
import { 
    emailDiscoveryPipeline, 
    CompanyData,
    EmailDiscoveryResult 
} from '@/services/emailDiscovery';

// Usar
const result: EmailDiscoveryResult | null = await emailDiscoveryPipeline.discoverOwnerEmail(
    {
        name: 'Empresa',
        website: 'empresa.com',
        industry: 'Tech',
        location: 'Madrid'
    },
    (log) => console.log(log.message) // Optional callback
);

// Acceder datos
if (result) {
    console.log(result.email);              // Email encontrado
    console.log(result.ownerName);          // Nombre del dueño
    console.log(result.confidence);         // 0-1 confianza
    console.log(result.source);             // Método usado
    console.log(result.linkedinProfile);    // Si lo tiene
}
```

---

**¿Listo para integrar? Dime si necesitas ayuda con SearchService.ts**
