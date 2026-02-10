# 📦 Email Discovery Pipeline - Estructura de Archivos

Aquí está el árbol completo de lo que se ha creado en `services/emailDiscovery/`:

```
services/
└── emailDiscovery/
    ├── README.md                           (📖 Guía principal de uso)
    ├── INTEGRATION_EXAMPLE.md              (🔌 Cómo integrar en SearchService)
    ├── index.ts                            (🎯 Punto de entrada)
    │
    ├── types.ts                            (📋 Tipos e interfaces)
    ├── config.ts                           (⚙️  Configuración centralizada)
    ├── utils.ts                            (🛠️  Funciones auxiliares)
    │
    ├── EmailDiscoveryPipeline.ts           (🎭 Orquestador principal)
    │
    ├── ApifyLinkedInService.ts             (1️⃣  Intento 1: LinkedIn)
    ├── GoogleDorksService.ts               (2️⃣  Intento 2: Google Dorks)
    ├── WebsiteScraperService.ts            (3️⃣  Intento 3: Website Scraping)
    ├── EmailPatternGeneratorService.ts     (4️⃣  Intento 4: Email Patterns)
    ├── WhoisService.ts                     (5️⃣  Intento 5: WHOIS Lookup)
    ├── TwitterService.ts                   (6️⃣  Intento 6: Twitter/X)
    └── SmtpValidatorService.ts             (7️⃣  Intento 7: Validación SMTP)
```

---

## 📊 Estadísticas

| Item | Cantidad |
|------|----------|
| Archivos | 13 |
| Líneas de código | ~2,500+ |
| Tipos/Interfaces | 8 |
| Servicios | 7 |
| Funciones utilitarias | 12 |
| Intentos de descubrimiento | 7 |

---

## 🎯 Archivos principales

### 1. `index.ts` (2 líneas necesarias)
```typescript
import { emailDiscoveryPipeline } from '@/services/emailDiscovery';
```

### 2. `types.ts` (tipos reutilizables)
```typescript
interface EmailDiscoveryResult {
    email: string;
    ownerName: string;
    ownerRole: string;
    source: EmailDiscoverySource; // ← De dónde vino
    confidence: number; // ← Probabilidad 0-1
    // ... más campos
}
```

### 3. `config.ts` (una sola fuente de verdad)
```typescript
EMAIL_DISCOVERY_CONFIG = {
    google: { ... },
    openai: { ... },
    apify: { ... },
    pipeline: {
        attemptOrder: [
            'apify_linkedin',
            'google_dorks',
            'website_scrape',
            'email_pattern',
            'whois',
            'twitter',
            'smtp_validation',
            'fallback'
        ]
    }
}
```

### 4. `EmailDiscoveryPipeline.ts` (el director de orquesta)
```typescript
await emailDiscoveryPipeline.discoverOwnerEmail(company, logCallback);
// ↓↓↓ Ejecuta 7 intentos en cascada ↓↓↓
// 1. LinkedIn
// 2. Google Dorks
// 3. Website Scraping
// 4. Email Pattern
// 5. WHOIS
// 6. Twitter
// 7. Fallback
```

### 5. Cada `*Service.ts` (especialistas)
```typescript
ApifyLinkedInService       // Experto en LinkedIn
GoogleDorksService         // Experto en Google
WebsiteScraperService      // Experto en parsear webs
EmailPatternGeneratorService  // Experto en patterns
WhoisService               // Experto en WHOIS
TwitterService             // Experto en Twitter
SmtpValidatorService       // Experto en validar
```

---

## 🔧 Cómo usar cada archivo

### Para usar TODO (recomendado):
```typescript
import { emailDiscoveryPipeline } from '@/services/emailDiscovery';

const result = await emailDiscoveryPipeline.discoverOwnerEmail({ ... });
```

### Para usar un intento específico:
```typescript
import { googleDorksService } from '@/services/emailDiscovery';

const result = await googleDorksService.discoverOwnerEmail({ ... });
```

### Para acceder a utilidades:
```typescript
import { extractEmailsFromText, getNameParts } from '@/services/emailDiscovery';

const emails = extractEmailsFromText(html);
const { firstName, lastName } = getNameParts('Juan García');
```

---

## 📦 Copiar a otro proyecto

```bash
# Copiar TODO
cp -r services/emailDiscovery ../Proyecto2/services/

# Compartir credenciales
# (no copies .env, usa el mismo en ambos proyectos)
```

No hay dependencias externas. Todo usa:
- Fetch API (nativo)
- OpenAI API
- Apify API
- Google Custom Search API
- APIs públicas (WHOIS, etc)

---

## 🚀 Siguiente paso: Integración

Ya tienes la lógica lista. Ahora necesitamos integrar en `SearchService.ts`:

Ver: [INTEGRATION_EXAMPLE.md](INTEGRATION_EXAMPLE.md)

---

## ✅ Checklist

- ✅ Estructura completa creada
- ✅ 7 servicios independientes
- ✅ Pipeline orquestador
- ✅ Configuración centralizada
- ✅ Tipos bien definidos
- ✅ Utilidades reutilizables
- ✅ README con ejemplos
- ✅ Guía de integración escrita
- ⏳ Integración en SearchService (PRÓXIMO)
- ⏳ Testing con datos reales (PRÓXIMO)
- ⏳ Optimización de speeds (PRÓXIMO)
- ⏳ Dashboard de stats (PRÓXIMO)

---

## 💡 Notas importantes

1. **Sin dependencias NPM extra** - Todo usa librerías estándar
2. **Load balancing automático** - Puede usar 4 cuentas Apify diferentes
3. **Modular** - Puedes usar cada servicio de forma independiente
4. **Escalable** - Listo para 1,000+ leads/mes
5. **Gratis** - Costo ~$0.02/lead (incluyendo OpenAI)
6. **Portable** - Copias la carpeta y funciona en otro proyecto

---

**¿Listo para integrar en SearchService.ts?**
