/**
 * Email Discovery Pipeline - Configuración
 * Centraliza todas las variables de entorno y constantes
 */

export const EMAIL_DISCOVERY_CONFIG = {
    // ═══════════════════════════════════════════════════════════════
    // Google Custom Search
    // ═══════════════════════════════════════════════════════════════
    google: {
        apiKey: import.meta.env.GOOGLE_API_KEY || '',
        customSearchEngineId: import.meta.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID || '',
        // Para proyecto 2 (opcional)
        customSearchEngineId2: import.meta.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID_PROJECT2 || '',
        
        // Límites
        maxQueriesPerDay: 100, // Gratis
        costPerExtraQuery: 0.0005, // Después de 100, cuesta $5 por 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // OpenAI (GPT-4o-mini para extracción)
    // ═══════════════════════════════════════════════════════════════
    openai: {
        apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 300,
        costPerRequest: 0.001, // Aproximado
    },

    // ═══════════════════════════════════════════════════════════════
    // Apify (para LinkedIn, Twitter)
    // ═══════════════════════════════════════════════════════════════
    apify: {
        apiToken: import.meta.env.VITE_APIFY_API_TOKEN || '',
        linkedinCompanyScraperId: 'apify/linkedin-company-scraper', // Actor ID para empresas
        twitterScraperId: 'apify/twitter-scraper', // Actor ID para Twitter
        timeout: 60000, // 60 segundos
    },

    // ═══════════════════════════════════════════════════════════════
    // WHOIS (Público, sin autenticación)
    // ═══════════════════════════════════════════════════════════════
    whois: {
        // APIs públicas (elegir una)
        providers: [
            {
                name: 'whoisjsonapi',
                baseUrl: 'https://whoisjsonapi.com/api/v1',
                costPerQuery: 0,
            },
            {
                name: 'domainsbot',
                baseUrl: 'https://api.domainsbot.com/v2/whois',
                costPerQuery: 0,
            }
        ],
    },

    // ═══════════════════════════════════════════════════════════════
    // Pipeline Behavior
    // ═══════════════════════════════════════════════════════════════
    pipeline: {
        // Parar en primer intento exitoso o continuar para comparar
        stopOnFirstSuccess: true,
        
        // Intentos a ejecutar en orden
        attemptOrder: [
            'apify_linkedin',
            'google_dorks',
            'website_scrape',
            'email_pattern',
            'whois',
            'twitter',
            'smtp_validation',
            'fallback'
        ],
        
        // Umbral mínimo de confianza para aceptar resultado
        minConfidenceThreshold: 0.5, // 50%
        
        // Timeouts por intento
        timeouts: {
            apify_linkedin: 15000,      // 15 segundos
            google_dorks: 5000,         // 5 segundos
            website_scrape: 8000,       // 8 segundos
            email_pattern: 2000,        // 2 segundos
            whois: 3000,                // 3 segundos
            twitter: 12000,             // 12 segundos
            smtp_validation: 10000,     // 10 segundos
        },
        
        // Parallel vs Sequential
        executeInParallel: false, // Cambiar a true para velocidad (pero más costoso)
    },

    // ═══════════════════════════════════════════════════════════════
    // Email Patterns
    // ═══════════════════════════════════════════════════════════════
    emailPatterns: {
        // Orden de probabilidad (primero = más probable)
        formats: [
            'firstname.lastname@',
            'f.lastname@',
            'firstname@',
            'fl@',
            'firstnamelastname@',
            'firstnameLastname@',
            'firstname_lastname@',
            'founder@',
            'ceo@',
            'admin@',
            'contact@',
            'info@',
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // Logging
    // ═══════════════════════════════════════════════════════════════
    logging: {
        enabled: true,
        verbose: false, // true = logs muy detallados
        logFile: null, // null = console, or '/path/to/file.log'
    },

    // ═══════════════════════════════════════════════════════════════
    // Cache
    // ═══════════════════════════════════════════════════════════════
    cache: {
        enabled: true,
        ttlMs: 86400000, // 24 horas
    }
};

/**
 * Valida que todas las credenciales necesarias estén configuradas
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!EMAIL_DISCOVERY_CONFIG.google.apiKey) {
        errors.push('❌ GOOGLE_API_KEY no configurada en .env');
    }
    if (!EMAIL_DISCOVERY_CONFIG.google.customSearchEngineId) {
        errors.push('❌ GOOGLE_CUSTOM_SEARCH_ENGINE_ID no configurada en .env');
    }
    if (!EMAIL_DISCOVERY_CONFIG.openai.apiKey) {
        errors.push('❌ VITE_OPENAI_API_KEY no configurada en .env');
    }
    if (!EMAIL_DISCOVERY_CONFIG.apify.apiToken) {
        errors.push('❌ VITE_APIFY_API_TOKEN no configurada en .env');
    }

    if (errors.length > 0) {
        console.error('⚠️ Configuración incompleta:');
        errors.forEach(e => console.error(e));
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
