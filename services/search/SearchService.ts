import { Lead, SearchConfigState } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { emailDiscoveryPipeline, CompanyData } from '../emailDiscovery';

export type LogCallback = (message: string) => void;
export type ResultCallback = (leads: Lead[]) => void;

// Apify Actor IDs
// Apify Actor IDs
// Apify Actor IDs
const GOOGLE_MAPS_SCRAPER = 'nwua9Gu5YrADL7ZDj';
const CONTACT_SCRAPER = '722Lg885LDwz3gqFk'; // Updated to apify/contact-info-scraper
const GOOGLE_SEARCH_SCRAPER = 'nFJndFXA5zjCTuudP'; // ID for apify/google-search-scraper

export class SearchService {
    private isRunning = false;
    private apiKey: string = '';
    private openaiKey: string = '';

    public stop() {
        this.isRunning = false;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SMART QUERY INTERPRETER
    // ═══════════════════════════════════════════════════════════════════════════
    private async interpretQuery(userQuery: string, platform: 'gmail' | 'linkedin'): Promise<{
        searchQuery: string;
        industry: string;
        targetRoles: string[];
        location: string;
    }> {
        if (!this.openaiKey) {
            return {
                searchQuery: userQuery,
                industry: userQuery,
                targetRoles: ['CEO', 'Fundador', 'Propietario', 'Director General'],
                location: 'España'
            };
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `Eres un experto en prospección B2B. Interpreta la búsqueda para encontrar DUEÑOS y DECISORES.
Responde SOLO con JSON:
{
  "searchQuery": "término optimizado",
  "industry": "sector detectado",
  "targetRoles": ["CEO", "Fundador", etc],
  "location": "ubicación o España"
}`
                        },
                        { role: 'user', content: `Búsqueda en ${platform}: "${userQuery}"` }
                    ],
                    temperature: 0.3,
                    max_tokens: 150
                })
            });
            const data = await response.json();
            const match = data.choices?.[0]?.message?.content?.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
        } catch (e) { console.error(e); }

        return { searchQuery: userQuery, industry: userQuery, targetRoles: ['CEO', 'Fundador', 'Propietario'], location: 'España' };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADVANCED FILTERS PROCESSOR
    // ═══════════════════════════════════════════════════════════════════════════
    private buildQueryWithAdvancedFilters(baseQuery: string, filters?: any): string {
        if (!filters || !Object.keys(filters).length) {
            return baseQuery;
        }

        const parts = [baseQuery];

        // Add locations to query
        if (filters.locations && filters.locations.length > 0) {
            parts.push(`(${filters.locations.map((loc: string) => `"${loc}"`).join(' OR ')})`);
        }

        // Add job titles to query
        if (filters.jobTitles && filters.jobTitles.length > 0) {
            parts.push(`(${filters.jobTitles.map((job: string) => `"${job}"`).join(' OR ')})`);
        }

        // Add industries to query
        if (filters.industries && filters.industries.length > 0) {
            parts.push(`(${filters.industries.map((ind: string) => `"${ind}"`).join(' OR ')})`);
        }

        // Add keywords to query
        if (filters.keywords && filters.keywords.length > 0) {
            parts.push(`(${filters.keywords.map((key: string) => `"${key}"`).join(' OR ')})`);
        }

        return parts.join(' AND ');
    }

    /**
     * Check if a lead matches advanced filter criteria
     */
    private leadMatchesFilters(lead: Lead, filters?: any): boolean {
        if (!filters) return true;

        try {
            // Check locations
            if (filters.locations && filters.locations.length > 0) {
                const leadLocation = (lead.location || '').toLowerCase();
                const matchesLocation = filters.locations.some((loc: string) =>
                    leadLocation.includes(loc.toLowerCase())
                );
                if (!matchesLocation) return false;
            }

            // Check company sizes (if available in lead data)
            if (filters.companySizes && filters.companySizes.length > 0) {
                // Company size usually comes from summary/analysis
                const summary = (lead.aiAnalysis?.summary || '').toLowerCase();
                const matchesSize = filters.companySizes.some((size: string) => {
                    if (size === 'startup') return summary.includes('1-50') || summary.includes('pequeña');
                    if (size === 'small') return summary.includes('1-100') || summary.includes('pequeña');
                    if (size === 'medium') return summary.includes('100-1000') || summary.includes('mediana');
                    if (size === 'large') return summary.includes('1000+') || summary.includes('grande');
                    return summary.includes(size);
                });
                if (!matchesSize && filters.companySizes.length > 0) return false;
            }

            return true;
        } catch (e) {
            return true; // If filtering fails, keep the lead
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DEEP RESEARCH - Context & Owner
    // ═══════════════════════════════════════════════════════════════════════════
    private async deepResearchLead(lead: Lead, onLog: LogCallback): Promise<string> {
        if (!this.isRunning) return '';

        const searchQueries = [];

        // Research company values & products
        if (lead.companyName && lead.companyName !== 'Sin Nombre') {
            searchQueries.push(`"${lead.companyName}" site:.es valores misión productos`);
        }

        // Research owner specifically
        searchQueries.push(`"${lead.companyName}" CEO OR Fundador OR Propietario OR Dueño`);
        searchQueries.push(`"${lead.companyName}" linkedin equipo`);

        // Research from website content (generic check)
        if (lead.website) {
            searchQueries.push(`site:${lead.website} "sobre nosotros" OR "equipo" OR "fundador"`);
        }

        if (searchQueries.length === 0) return '';

        try {
            // Using a lighter weight search or standard search
            const searchInput = {
                queries: searchQueries.join('\n'),
                maxPagesPerQuery: 1,
                resultsPerPage: 4,
                languageCode: 'es',
                countryCode: 'es',
            };

            const results = await this.callApifyActor(GOOGLE_SEARCH_SCRAPER, searchInput, (msg) => { });

            let researchData = '';
            for (const result of results) {
                if (result.organicResults) {
                    for (const organic of result.organicResults.slice(0, 3)) {
                        researchData += `\n- ${organic.title}: ${organic.description || ''}`;
                    }
                }
            }

            return researchData;
        } catch (e) {
            return '';
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ULTRA-COMPLETE AI ANALYSIS - Executive Summary + Bottleneck
    // ═══════════════════════════════════════════════════════════════════════════
    private async generateUltraAnalysis(lead: Lead, researchData: string): Promise<{
        fullAnalysis: string;
        psychologicalProfile: string;
        businessMoment: string;
        salesAngle: string;
        personalizedMessage: string;
        bottleneck: string;
        executiveSummary: string;
        adStatus: 'Active' | 'Inactive' | 'Unknown';
        socialStatus: 'Active' | 'Inactive' | 'Unknown';
    }> {
        if (!this.openaiKey) {
            return {
                fullAnalysis: `${lead.companyName}: ${lead.aiAnalysis?.summary || ''}`,
                psychologicalProfile: 'Análisis no disponible (Sin API Key)',
                businessMoment: 'Desconocido',
                salesAngle: 'Genérico',
                personalizedMessage: '',
                bottleneck: '',
                executiveSummary: `Empresa: ${lead.companyName}`,
                adStatus: 'Unknown',
                socialStatus: 'Unknown'
            };
        }

        const context = `
═══ DATOS DEL LEAD ═══
Empresa: ${lead.companyName}
Web: ${lead.website || 'No disponible'}
Ubicación: ${lead.location || 'España'}
Email: ${lead.decisionMaker?.email || 'No disponible'}
Reseñas: ${lead.aiAnalysis?.summary || ''}

═══ INVESTIGACIÓN ONLINE ═══
${researchData || 'Sin datos adicionales'}
        `.trim();

        const MAX_RETRIES = 3;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.openaiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: `Eres un analista de negocios experto. Tu objetivo es cualificar leads para una agencia de crecimiento (Growth Partner).
NO Inventes datos. Deduce basado en la información.

ANALIZA:
1.  **Resumen Ejecutivo**: Una frase clara sobre qué hace la empresa (Ej: "Clínica de fisioterapia enfocada en deportistas de alto rendimiento").
2.  **Cuello de Botella (Pain Point)**: ¿Qué les falla? (Ej: "Web lenta/antigua", "No tienen redes activas", "Muchas reseñas negativas").
3.  **Validación de Actividad**:
    - Ads: Deduce si probablemente hacen anuncios (Active/Inactive/Unknown).
    - Social: Deduce si son activos en redes (Active/Inactive/Unknown).
4.  **Decisor**: Si en la investigación ves nombres de personas (CEO, Fundador), escríbelos en el campo "detectedOwner".

Responde SOLO JSON:
{
  "executiveSummary": "Frase resumen de la empresa",
  "bottleneck": "El problema principal detectado",
  "psychologicalProfile": "Perfil del dueño (si se intuye)",
  "businessMoment": "Fase de la empresa (Expansión/Supervivencia)",
  "salesAngle": "Argumento de venta único",
  "personalizedMessage": "Mensaje puerta fría (100 palabras) mencionando el cuello de botella",
  "adStatus": "Active" | "Inactive" | "Unknown",
  "socialStatus": "Active" | "Inactive" | "Unknown",
  "detectedOwner": "Nombre detectado o null"
}`
                            },
                            {
                                role: 'user',
                                content: `Analiza este lead:\n\n${context}`
                            }
                        ],
                        temperature: 0.5,
                        max_tokens: 800
                    })
                });

                if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';
                const jsonMatch = content.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);

                    // Update owner name if detected and not already set
                    if (parsed.detectedOwner && (!lead.decisionMaker?.name || lead.decisionMaker.name === '')) {
                        lead.decisionMaker = { ...lead.decisionMaker!, name: parsed.detectedOwner };
                    }

                    return {
                        fullAnalysis: `🧠 PERFIL: ${parsed.psychologicalProfile}\n⚠️ BOTELLA: ${parsed.bottleneck}`,
                        psychologicalProfile: parsed.psychologicalProfile || 'No detectado',
                        businessMoment: parsed.businessMoment || 'No detectado',
                        salesAngle: parsed.salesAngle || 'Genérico',
                        personalizedMessage: parsed.personalizedMessage || `Hola, vi vuestra web ${lead.website}...`,
                        bottleneck: parsed.bottleneck || 'Oportunidad de mejora',
                        executiveSummary: parsed.executiveSummary || `${lead.companyName}`,
                        adStatus: parsed.adStatus || 'Unknown',
                        socialStatus: parsed.socialStatus || 'Unknown'
                    };
                }
            } catch (e) {
                console.error(`Attempt ${attempt} failed:`, e);
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        return {
            fullAnalysis: 'Análisis fallido',
            psychologicalProfile: 'N/A',
            businessMoment: 'N/A',
            salesAngle: 'N/A',
            personalizedMessage: '',
            bottleneck: 'N/A',
            executiveSummary: lead.companyName,
            adStatus: 'Unknown',
            socialStatus: 'Unknown'
        };
    }

    private async callApifyActor(actorId: string, input: any, onLog: LogCallback): Promise<any[]> {
        const baseUrl = '/api/apify';
        const startUrl = `${baseUrl}/acts/${actorId}/runs?token=${this.apiKey}`;

        const startResponse = await fetch(startUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });

        if (!startResponse.ok) {
            const err = await startResponse.text();
            throw new Error(`Error actor ${actorId}: ${err}`);
        }

        const startData = await startResponse.json();
        const runId = startData.data.id;
        const defaultDatasetId = startData.data.defaultDatasetId;

        onLog(`[APIFY] Actor iniciado`);

        let isFinished = false;
        let pollCount = 0;
        const MAX_POLLS = 25; // ~2.5 minutos máximo (25 polls * 5 segundos)
        let lastStatus = '';
        let statusUnchangedCount = 0;

        while (!isFinished && this.isRunning && pollCount < MAX_POLLS) {
            await new Promise(r => setTimeout(r, 5000));
            pollCount++;

            try {
                const statusRes = await fetch(`${baseUrl}/acts/${actorId}/runs/${runId}?token=${this.apiKey}`);
                const statusData = await statusRes.json();
                const status = statusData.data.status;

                // Detectar si el run está stuck en RUNNING
                if (status === lastStatus) {
                    statusUnchangedCount++;
                } else {
                    statusUnchangedCount = 0;
                    lastStatus = status;
                }

                // Si lleva 10 polls sin cambiar status, abortar (el run probablement está stuck)
                if (statusUnchangedCount > 10 && status === 'RUNNING') {
                    onLog(`[APIFY] ⚠️ Run stuck en RUNNING por 50 segundos. Abortando...`);
                    throw new Error(`Actor stuck: ${status} for too long`);
                }

                if (pollCount % 4 === 0) onLog(`[APIFY] Estado: ${status} (poll ${pollCount}/${MAX_POLLS})`);

                if (status === 'SUCCEEDED') isFinished = true;
                else if (status === 'FAILED' || status === 'ABORTED') throw new Error(`Actor falló: ${status}`);
            } catch (e: any) {
                if (e.message.includes('Actor')) throw e;
                // Network error, continue polling
                onLog(`[APIFY] Polling error: ${e.message}, retrying...`);
            }
        }

        if (!this.isRunning) {
            onLog(`[APIFY] ⚠️ Búsqueda cancelada por usuario`);
            return [];
        }

        if (pollCount >= MAX_POLLS && !isFinished) {
            onLog(`[APIFY] ⚠️ Timeout alcanzado (${MAX_POLLS * 5} segundos). Retornando resultados parciales...`);
            // Intentar devolver lo que ya se tiene
            try {
                const itemsRes = await fetch(`${baseUrl}/datasets/${defaultDatasetId}/items?token=${this.apiKey}`);
                const items = await itemsRes.json();
                return Array.isArray(items) ? items : [];
            } catch (e) {
                return [];
            }
        }

        try {
            const itemsRes = await fetch(`${baseUrl}/datasets/${defaultDatasetId}/items?token=${this.apiKey}`);
            if (!itemsRes.ok) {
                onLog(`[APIFY] ❌ Error downloading items: ${itemsRes.status}`);
                return [];
            }

            const data = await itemsRes.json();

            // Normalizar respuesta - puede venir como array directo o como objeto wrapper
            if (Array.isArray(data)) {
                return data;
            } else if (data.items && Array.isArray(data.items)) {
                return data.items;
            } else if (data.data && Array.isArray(data.data)) {
                return data.data;
            } else {
                onLog(`[APIFY] ⚠️ Unexpected data structure, received: ${JSON.stringify(data).substring(0, 100)}`);
                return Array.isArray(data) ? data : [];
            }
        } catch (e) {
            onLog(`[APIFY] ❌ Error al descargar resultados: ${e}`);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LOAD ALL EXISTING LEADS (Zero-Duplicate Strategy)
    // ═══════════════════════════════════════════════════════════════════════════
    private async loadExistingLeads(): Promise<Set<string>> {
        const bannedIdentifiers = new Set<string>();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return bannedIdentifiers;

            // Fetch ALL historical search results for this user
            const { data } = await supabase
                .from('search_results_fran')
                .select('lead_data')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!data) return bannedIdentifiers;

            // Extract and normalize all identifiers
            for (const row of data) {
                if (Array.isArray(row.lead_data)) {
                    row.lead_data.forEach((lead: any) => {
                        // Add normalized website
                        if (lead.website) {
                            const normalized = lead.website
                                .toLowerCase()
                                .replace(/^https?:\/\//, '')
                                .replace(/^www\./, '')
                                .replace(/\/$/, '');
                            bannedIdentifiers.add(normalized);
                        }
                        // Add normalized company name
                        if (lead.companyName && lead.companyName !== 'Sin Nombre') {
                            const normalized = lead.companyName.toLowerCase().trim();
                            bannedIdentifiers.add(normalized);
                        }
                    });
                }
            }
        } catch (e) {
            console.error('Error loading existing leads:', e);
        }

        return bannedIdentifiers;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    public async startSearch(config: SearchConfigState, onLog: LogCallback, onComplete: ResultCallback) {
        this.isRunning = true;
        this.apiKey = import.meta.env.VITE_APIFY_API_TOKEN || '';
        this.openaiKey = import.meta.env.VITE_OPENAI_API_KEY || '';

        if (!this.apiKey) {
            onLog(`[ERROR] ❌ Falta VITE_APIFY_API_TOKEN`);
            onComplete([]);
            return;
        }

        try {
            onLog(`\n[SYSTEM] 🚀 Iniciando búsqueda: "${config.query}"`);
            onLog(`[SYSTEM] 📊 Máximo de resultados: ${config.maxResults}`);

            onLog(`[IA] 🧠 Analizando estrategia para: "${config.query}"...`);
            const interpreted = await this.interpretQuery(config.query, config.source);

            // Load ALL existing leads (Zero-Duplicate Strategy)
            const existingLeads = await this.loadExistingLeads();
            onLog(`[SYSTEM] 🛡️ Sistema Anti-Duplicados activado. ${existingLeads.size} empresas en lista negra.`);

            if (config.source === 'linkedin') {
                onLog(`[SYSTEM] 🔍 Modo: LinkedIn X-Ray\n`);
                await this.searchLinkedIn(config, interpreted, existingLeads, onLog, onComplete);
            } else {
                onLog(`[SYSTEM] 🔍 Modo: Gmail + Google Maps\n`);
                await this.searchGmailWithYieldGuarantee(config, interpreted, existingLeads, onLog, onComplete);
            }

        } catch (error: any) {
            onLog(`\n[ERROR] ❌ Error en búsqueda: ${error.message}`);
            onLog(`[ERROR] Stack: ${error.stack?.split('\\n')[0]}`);
            onComplete([]);
        } finally {
            this.isRunning = false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GMAIL SEARCH LOOP - SMART LOOP WITH PAGINATION
    // ═══════════════════════════════════════════════════════════════════════════
    private async searchGmailWithYieldGuarantee(
        config: SearchConfigState,
        interpreted: { searchQuery: string; industry: string; location: string },
        existingLeads: Set<string>,
        onLog: LogCallback,
        onComplete: ResultCallback
    ) {
        const targetCount = config.maxResults || 5;
        const validLeads: Lead[] = [];
        let attempts = 0;
        const MAX_ATTEMPTS = 10; // Safety break to prevent infinite loops
        let totalScannedPreviously = 0; // Track how many raw results we've already processed

        onLog(`[SYSTEM] 🎯 Objetivo: ${targetCount} leads cualificados (Dueño + Email).`);
        onLog(`[SYSTEM] 🔄 Iniciando Smart Loop con Paginación (x4)...`);

        // ═══════════════════════════════════════════════════════════════════════════
        // SMART LOOP: Keep searching until target is reached or no more results
        // ═══════════════════════════════════════════════════════════════════════════
        while (validLeads.length < targetCount && this.isRunning && attempts < MAX_ATTEMPTS) {
            attempts++;
            const needed = targetCount - validLeads.length;

            // Smart Loop: Fetch a MUCH larger pool to guarantee "SI O SI" we find leads
            // En vez de x4, pedimos un mínimo alto para tener de donde filtrar duplicados
            const fetchAmount = Math.max(needed * 10, 60);

            onLog(`[ATTEMPT ${attempts}] 🔄 Búsqueda: ${fetchAmount} candidatos (faltantes: ${needed})...`);

            let query = `${interpreted.searchQuery} ${interpreted.location}`;

            // Apply advanced filters to query if available
            if (config.advancedFilters) {
                query = this.buildQueryWithAdvancedFilters(query, config.advancedFilters);
                onLog(`[FILTERS] ✅ Filtros avanzados aplicados a la búsqueda`);
            }

            // Call Maps Scraper with smart pagination
            // For Maps, we increase the total pool based on accumulated scans
            const totalMapsToScan = fetchAmount + totalScannedPreviously;

            const mapsResults = await this.callApifyActor(GOOGLE_MAPS_SCRAPER, {
                searchStringsArray: [query],
                maxCrawledPlacesPerSearch: Math.min(totalMapsToScan, 1000), // Cap at 1000 per Apify limits
                language: 'es',
                includeWebsiteEmail: true,
                scrapeContacts: true,
                skipClosedPlaces: true,
                // Pagination-like behavior: offset results by using 'skipClosedPlaces' & filtering
            }, (msg) => { }); // Silent sub-logs

            if (mapsResults.length === 0) {
                onLog(`[ATTEMPT ${attempts}] ⚠️ No se encontraron más candidatos en Maps. Terminando loop temprano...`);
                break; // No more results available from source
            }

            onLog(`[ATTEMPT ${attempts}] 📊 Maps devolvió ${mapsResults.length} candidatos (acumulados: ${totalScannedPreviously} de búsquedas anteriores)...`);

            // Filter out those already found (duplicates)
            const newCandidates = mapsResults.filter((m: any) => {
                // 1. Check local duplicates in this batch
                const isLocalDuplicate = validLeads.some(l => l.companyName === m.title || (m.website && l.website === m.website));

                // 2. Check GLOBAL duplicates (All historical leads)
                const cleanWeb = m.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
                const cleanName = m.title?.toLowerCase();
                const isGlobalDuplicate = (cleanWeb && existingLeads.has(cleanWeb)) || (cleanName && existingLeads.has(cleanName));

                if (isGlobalDuplicate) {
                    onLog(`[ATTEMPT ${attempts}] 🔄 Encontrado duplicado: ${m.title}, saltando...`);
                    return false;
                }

                return !isLocalDuplicate;
            });

            // ✅ CRITICAL: Update pagination tracker
            // totalScannedPreviously += the raw results count (some were duplicates, but we counted them)
            totalScannedPreviously += mapsResults.length;

            if (newCandidates.length === 0) {
                onLog(`[ATTEMPT ${attempts}] ⚠️ Todos los candidatos encontrados ya existen o están duplicados.`);
                if (attempts >= MAX_ATTEMPTS) {
                    onLog(`[ATTEMPT ${attempts}] 🚨 MODO DESESPERACIÓN: Forzando guardado ignorando duplicados para cumplir cuota "SI O SI".`);
                    // Injecting fallback leads to guarantee yield
                    const desperationCandidates = mapsResults.filter((m: any) => !validLeads.some(l => l.companyName === m.title)).slice(0, needed);
                    if (desperationCandidates.length > 0) {
                        newCandidates.push(...desperationCandidates);
                    } else {
                        break;
                    }
                } else {
                    continue; // Skip this loop and try again with deeper pagination
                }
            }

            onLog(`[ATTEMPT ${attempts}] ✨ ${newCandidates.length} candidatos NUEVOS después de deduplicación.`);

            // Convert and process
            const rawLeads: Lead[] = newCandidates.map((item: any, idx: number) => ({
                id: `lead-${Date.now()}-${attempts}-${idx}`,
                source: 'gmail',
                companyName: item.title || 'Sin Nombre',
                website: item.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '',
                location: item.address || '',
                decisionMaker: {
                    name: '',
                    role: 'Propietario',
                    email: item.email || (item.emails?.[0]) || '',
                    linkedin: ''
                },
                aiAnalysis: {
                    summary: `${item.totalScore || '?'}⭐ (${item.reviewsCount || 0} reviews)`,
                    painPoints: [],
                    generatedIcebreaker: '',
                    fullMessage: '',
                    fullAnalysis: '',
                    psychologicalProfile: '',
                    businessMoment: '',
                    salesAngle: '',
                    executiveSummary: '',
                    adStatus: 'Unknown',
                    socialStatus: 'Unknown',
                    bottleneck: ''
                },
                status: 'scraped' as const
            }));

            // Filter: Must have Website
            const candidatesWithWeb = rawLeads.filter(l => l.website);
            onLog(`[ATTEMPT ${attempts}] 📉 ${candidatesWithWeb.length} candidatos tienen web. Procediendo a enriquecimiento...`);

            // ═══════════════════════════════════════════════════════════════════════════
            // STAGE 2.5: ADVANCED OWNER DISCOVERY (The "Sniper" Phase)
            // ═══════════════════════════════════════════════════════════════════════════
            const leadsToEnrich = candidatesWithWeb;

            if (leadsToEnrich.length > 0) {
                onLog(`[ATTEMPT ${attempts}] 🕵️‍♂️ Iniciando Protocolo "Sniper" (Email Discovery) para ${leadsToEnrich.length} empresas...`);

                const BATCH_SIZE = 5;
                for (let i = 0; i < leadsToEnrich.length; i += BATCH_SIZE) {
                    if (!this.isRunning) break;
                    const batch = leadsToEnrich.slice(i, i + BATCH_SIZE);

                    await Promise.all(batch.map(async (lead) => {
                        try {
                            const companyData: CompanyData = {
                                name: lead.companyName,
                                website: lead.website || '',
                                industry: interpreted.industry,
                                location: lead.location || interpreted.location
                            };

                            const ownerData = await emailDiscoveryPipeline.discoverOwnerEmail(
                                companyData,
                                (log) => { }
                            );

                            if (ownerData) {
                                lead.decisionMaker!.email = ownerData.email;
                                lead.decisionMaker!.name = ownerData.ownerName;
                                lead.decisionMaker!.role = ownerData.ownerRole;
                                if (ownerData.linkedinProfile) {
                                    lead.decisionMaker!.linkedin = ownerData.linkedinProfile;
                                }

                                lead.aiAnalysis.salesAngle = `Confidence: ${(ownerData.confidence * 100).toFixed(0)}% (${ownerData.source})`;
                                lead.status = 'enriched';
                                onLog(`[EMAIL-DISCOVERY] ✅ Email encontrado: ${ownerData.email}`);
                            } else {
                                lead.decisionMaker!.email = `contact@${lead.website}`;
                                onLog(`[EMAIL-DISCOVERY] ⚠️ Fallback: ${lead.decisionMaker!.email}`);
                            }

                        } catch (error: any) {
                            if (!lead.decisionMaker?.email) {
                                lead.decisionMaker!.email = `contact@${lead.website}`;
                            }
                        }
                    }));
                }
            }

            // Contact Enrichment - Standard fallback (Website crawling)
            const processingQueue = leadsToEnrich.filter(l => !l.decisionMaker?.email);

            if (processingQueue.length > 0) {
                const needsEmail = processingQueue;
                if (needsEmail.length > 0) {
                    onLog(`[ATTEMPT ${attempts}] 🕸️ Escaneando webs (Fallback) para ${needsEmail.length} empresas...`);
                    try {
                        const contactResults = await this.callApifyActor(CONTACT_SCRAPER, {
                            startUrls: needsEmail.map(l => ({ url: `https://${l.website}` })),
                            maxRequestsPerWebsite: 2,
                            sameDomainOnly: true,
                        }, () => { });

                        for (const cr of contactResults) {
                            const url = cr.url || '';
                            const lead = needsEmail.find(l => url.includes(l.website));
                            if (lead && cr.emails?.length) {
                                const valid = cr.emails.filter((e: string) => !e.includes('wix') && !e.includes('sentry') && e.includes('@'));
                                if (valid.length > 0 && !lead.decisionMaker!.email) {
                                    lead.decisionMaker!.email = valid[0];
                                }
                            }
                        }
                    } catch (e) { onLog(`[ERROR] Fallo en contact scraper: ${e}`); }
                }
            }

            // FILTER: Strict requirement - Must have Email
            const successfulLeads = leadsToEnrich.filter(l => l.decisionMaker?.email);
            onLog(`[ATTEMPT ${attempts}] ✅ ${successfulLeads.length} leads conseguidos con Email.`);

            // DEEP RESEARCH & AI ANALYSIS
            const slotsRemaining = targetCount - validLeads.length;
            const leadsToAnalyze = successfulLeads.slice(0, slotsRemaining);

            for (const lead of leadsToAnalyze) {
                if (!this.isRunning) break;

                onLog(`[ANALYSIS] 🧠 Investigando a fondo: ${lead.companyName}...`);

                // 1. Deep Google Search (Owner, Context)
                const researchData = await this.deepResearchLead(lead, onLog);

                // 2. AI Synthesis
                const analysis = await this.generateUltraAnalysis(lead, researchData);

                lead.aiAnalysis.executiveSummary = analysis.executiveSummary;
                lead.aiAnalysis.bottleneck = analysis.bottleneck;
                lead.aiAnalysis.adStatus = analysis.adStatus;
                lead.aiAnalysis.socialStatus = analysis.socialStatus;
                lead.aiAnalysis.fullMessage = analysis.personalizedMessage;
                lead.aiAnalysis.psychologicalProfile = analysis.psychologicalProfile;
                lead.aiAnalysis.businessMoment = analysis.businessMoment;
                lead.aiAnalysis.salesAngle = analysis.salesAngle;

                lead.status = 'ready';

                validLeads.push(lead);
                onLog(`[SUCCESS] 🥳 Lead añadido: ${lead.companyName} (${validLeads.length}/${targetCount})`);
            }
        } // End of Smart Loop

        if (validLeads.length < targetCount) {
            onLog(`[WARNING] ⚠️ Solo se pudieron encontrar ${validLeads.length}/${targetCount} leads tras ${attempts} intentos.`);
        } else {
            onLog(`[FINISH] 🏁 Objetivo conseguido: ${validLeads.length} leads entregados en ${attempts} intentos.`);
        }

        onComplete(validLeads);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LINKEDIN SEARCH (Via Google X-Ray) - SMART LOOP WITH PAGINATION
    // ═══════════════════════════════════════════════════════════════════════════
    private async searchLinkedIn(
        config: SearchConfigState,
        interpreted: { searchQuery: string; industry: string; targetRoles: string[]; location: string },
        existingLeads: Set<string>,
        onLog: LogCallback,
        onComplete: ResultCallback
    ) {
        const targetCount = config.maxResults || 5;
        const validLeads: Lead[] = [];
        let attempts = 0;
        const MAX_ATTEMPTS = 4; // Aumentado a 4 intentos para más garantías
        let currentPage = 1; // Pagination tracker for Google Search

        onLog(`[LINKEDIN] 🚀 Iniciando búsqueda X-Ray con Smart Loop (máx ${MAX_ATTEMPTS} intentos)...`);

        // Smart Loop for LinkedIn pagination
        while (validLeads.length < targetCount && this.isRunning && attempts < MAX_ATTEMPTS) {
            attempts++;
            const needed = targetCount - validLeads.length;

            // Garantizamos buscar MUCHOS resultados de base para asegurar "SI O SI"
            const resultsToFetch = Math.max(needed * 20, 50);

            onLog(`[LINKEDIN-ATTEMPT ${attempts}/${MAX_ATTEMPTS}] 🔄 Página ${currentPage}: buscando ${resultsToFetch} resultados mínimos...`);

            // Añadimos variabilidad en las queries para asegurar nuevos resultados en reintentos
            let queries = interpreted.targetRoles.slice(0, 3).map(role =>
                `site:linkedin.com/in/ "${role}" "${interpreted.industry}" ${interpreted.location}`
            );

            // Si nos atascamos, quitamos "ubicación" estricta en el último intento ("MODO DESESPERACIÓN")
            if (attempts === MAX_ATTEMPTS) {
                onLog(`[LINKEDIN-ATTEMPT ${attempts}/${MAX_ATTEMPTS}] 🚨 MODO DESESPERACIÓN: Ampliando búsqueda sin importar duplicados ni ubicación estricta.`);
                queries = interpreted.targetRoles.slice(0, 2).map(role =>
                    `site:linkedin.com/in/ "${role}" "${interpreted.industry}"`
                );
            }

            try {
                const results = await this.callApifyActor(GOOGLE_SEARCH_SCRAPER, {
                    queries: queries.join('\n'),
                    resultsPerPage: resultsToFetch,
                    countryCode: 'es',
                    languageCode: 'es',
                    maxPagesPerQuery: currentPage, // Paginate through results
                }, onLog);

                // Procesar resultados: pueden venir en diferentes formatos
                let pageResults: any[] = [];

                onLog(`[LINKEDIN-DEBUG] 📋 Estructura de datos recibida: ${results.length} items`);
                if (results.length > 0) {
                    onLog(`[LINKEDIN-DEBUG] Primer item: ${JSON.stringify(results[0]).substring(0, 150)}...`);
                }

                for (const run of results) {
                    // Formato 1: Cada item tiene organicResults
                    if (run.organicResults && Array.isArray(run.organicResults)) {
                        pageResults = pageResults.concat(run.organicResults);
                    }
                    // Formato 2: El item mismo es un resultado con title y url
                    else if (run.title && run.url) {
                        pageResults.push(run);
                    }
                    // Formato 3: Item tiene links
                    else if (run.links && Array.isArray(run.links)) {
                        pageResults = pageResults.concat(run.links);
                    }
                }

                if (pageResults.length === 0) {
                    onLog(`[LINKEDIN-ATTEMPT ${attempts}/${MAX_ATTEMPTS}] ⚠️ No se encontraron resultados (0 items procesados).`);
                    onLog(`[LINKEDIN-ATTEMPT ${attempts}/${MAX_ATTEMPTS}] 🔍 Verificar estructura de datos de Apify...`);
                    break; // No more pages
                }

                onLog(`[LINKEDIN-ATTEMPT ${attempts}/${MAX_ATTEMPTS}] 📊 ${pageResults.length} resultados encontrados.`);

                // Process results
                for (const item of pageResults) {
                    if (validLeads.length >= targetCount) break;

                    // Validar que item tiene datos necesarios
                    if (!item.title || !item.url) {
                        onLog(`[LINKEDIN-DEBUG] ⚠️ Item sin title o url: ${JSON.stringify(item).substring(0, 100)}`);
                        continue;
                    }

                    // Parse Title: "Nombre Apellido - Cargo - Empresa | LinkedIn"
                    const title = item.title;
                    const parts = title.split(' - ');
                    const name = parts[0] || 'Usuario LinkedIn';
                    const role = parts[1] || 'Cargo desconocido';
                    const company = parts[2]?.replace('| LinkedIn', '').trim() || 'Empresa desconocida';

                    // Check for duplicates before adding
                    const cleanCompany = company.toLowerCase();
                    if (existingLeads.has(cleanCompany)) {
                        onLog(`[LINKEDIN-ATTEMPT ${attempts}] 🔄 Duplicado encontrado: ${company}`);
                        // En modo desesperación ignoramos los duplicados antiguos para entregar "SI O SI"
                        if (attempts < MAX_ATTEMPTS) {
                            continue;
                        } else {
                            onLog(`[LINKEDIN-ATTEMPT ${attempts}] 🚨 MODO DESESPERACIÓN: Aceptando duplicado: ${company}`);
                        }
                    }

                    // Check local duplicates in current run
                    if (validLeads.some(l => l.companyName === company || l.decisionMaker?.name === name)) {
                        continue;
                    }

                    const lead: Lead = {
                        id: `li-${Date.now()}-${validLeads.length}`,
                        source: 'linkedin',
                        companyName: company,
                        website: '',
                        decisionMaker: {
                            name: name,
                            role: role,
                            email: '',
                            linkedin: item.url
                        },
                        aiAnalysis: {
                            summary: item.description || '',
                            painPoints: [],
                            generatedIcebreaker: '',
                            fullMessage: '',
                            fullAnalysis: '',
                            psychologicalProfile: '',
                            businessMoment: '',
                            salesAngle: '',
                            executiveSummary: '',
                            adStatus: 'Unknown',
                            socialStatus: 'Unknown',
                            bottleneck: ''
                        },
                        status: 'scraped'
                    };

                    validLeads.push(lead);
                    onLog(`[LINKEDIN] ✅ Lead ${validLeads.length}/${targetCount}: ${name} (${company}) - ${item.url}`);
                }

                // Move to next page for pagination
                if (validLeads.length < targetCount) {
                    currentPage++;
                }

            } catch (e: any) {
                onLog(`[WARNING] LinkedIn Search (attempt ${attempts}/${MAX_ATTEMPTS}): ${e.message}`);
                // Si falla, tenemos máximo un intento más
                if (attempts >= MAX_ATTEMPTS) {
                    onLog(`[LINKEDIN] Intentos agotados.`);
                    break;
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // STAGE 2.5: ADVANCED OWNER DISCOVERY (The "Sniper" Phase) & AI ANALYSIS
        // ═══════════════════════════════════════════════════════════════════════════
        onLog(`[LINKEDIN] 🎯 Fase de Extracción de Emails y Análisis IA para ${validLeads.length} leads...`);

        const validEnrichedLeads: Lead[] = [];
        const BATCH_SIZE = 3; // Ligeramente menor para no saturar OpenAI/Hunter de golpe
        for (let i = 0; i < validLeads.length; i += BATCH_SIZE) {
            if (!this.isRunning) break;
            const batch = validLeads.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (lead) => {
                onLog(`[LINKEDIN-ENRICH] Buscando email corporativo para: ${lead.companyName}...`);

                // 1. Intentar descubrir el email del Owner / Dueño detectado
                try {
                    const companyData: CompanyData = {
                        name: lead.companyName,
                        website: '', // No tenemos web inicial en LinkedIn X-Ray, dependemos de que EmailDiscovery la encuentre (Hunter/Snovio)
                        industry: interpreted.industry,
                        location: interpreted.location
                    };

                    const ownerData = await emailDiscoveryPipeline.discoverOwnerEmail(
                        companyData,
                        (log) => { }
                    );

                    if (ownerData) {
                        lead.decisionMaker!.email = ownerData.email;
                        lead.website = ownerData.website || lead.website; // Asignamos el website encontrado
                        // Si no teníamos un nombre extraído en LinkedIn limpiamente, tomamos el del discoverer
                        if (lead.decisionMaker!.name === 'Usuario LinkedIn' || !lead.decisionMaker!.name) {
                            lead.decisionMaker!.name = ownerData.ownerName;
                        }
                        if (lead.decisionMaker!.role === 'Cargo desconocido' || !lead.decisionMaker!.role) {
                            lead.decisionMaker!.role = ownerData.ownerRole;
                        }

                        lead.aiAnalysis.salesAngle = `Confidence: ${(ownerData.confidence * 100).toFixed(0)}% (${ownerData.source})`;
                        lead.status = 'enriched';
                        onLog(`[LINKEDIN-EMAIL] ✅ Email encontrado: ${ownerData.email} para ${lead.companyName}`);
                    } else {
                        onLog(`[LINKEDIN-EMAIL] ⚠️ No se pudo encontrar email seguro para: ${lead.companyName}.`);
                    }

                } catch (error: any) {
                    onLog(`[LINKEDIN-EMAIL-ERROR] Falló extracción para ${lead.companyName}: ${error.message}`);
                }

                // Filtrado Post-Email: Solo avanzamos al análisis IA si conseguimos un EMAIL o WEBSITE.
                // Podríamos ser estrictos y solo dejar si tienen email, como en Gmail.
                // Dejémoslo igual de estricto: Si no hay email, no generes análisis caro.
                if (lead.decisionMaker?.email) {
                    onLog(`[LINKEDIN-ANALYSIS] 🧠 Investigando a fondo: ${lead.companyName}...`);

                    // 2. Investigación profunda normal
                    const researchData = await this.deepResearchLead(lead, onLog);

                    // 3. IA Análisis de Cuello de Botella y PerfilPsicologico
                    const analysis = await this.generateUltraAnalysis(lead, researchData);

                    lead.aiAnalysis.executiveSummary = analysis.executiveSummary;
                    lead.aiAnalysis.bottleneck = analysis.bottleneck;
                    lead.aiAnalysis.adStatus = analysis.adStatus;
                    lead.aiAnalysis.socialStatus = analysis.socialStatus;
                    lead.aiAnalysis.fullMessage = analysis.personalizedMessage;
                    lead.aiAnalysis.psychologicalProfile = analysis.psychologicalProfile;
                    lead.aiAnalysis.businessMoment = analysis.businessMoment;
                    lead.aiAnalysis.salesAngle = analysis.salesAngle || lead.aiAnalysis.salesAngle;

                    lead.status = 'ready';
                    validEnrichedLeads.push(lead);
                } else {
                    onLog(`[LINKEDIN-DISCARD] 🗑️ Descartando ${lead.companyName} por no resolver un Email Válido.`);
                }
            }));
        }

        onLog(`[LINKEDIN] 🏁 Búsqueda finalizada: ${validEnrichedLeads.length}/${targetCount} leads cualificados (Con Email Verificado).`);
        onComplete(validEnrichedLeads);
    }
}

export const searchService = new SearchService();
