import { Lead, SearchConfigState } from '../../lib/types';
import { supabase } from '../../lib/supabase';

export type LogCallback = (message: string) => void;
export type ResultCallback = (leads: Lead[]) => void;

// Apify Actor IDs
const GOOGLE_MAPS_SCRAPER = 'nwua9Gu5YrADL7ZDj';
const CONTACT_SCRAPER = 'vdrmO1lXCkhbPjE9j';
const GOOGLE_SEARCH_SCRAPER = 'nFJndFXA5zjCTuudP'; // ID for apify/google-search-scraper

export class SearchService {
    private isRunning = false;
    private apiKey: string = '';
    private openaiKey: string = '';
    private tabooSet: Set<string> = new Set(); // Anti-Duplicate Memory

    public stop() {
        this.isRunning = false;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ANTI-DUPLICATE LOGIC
    // ═══════════════════════════════════════════════════════════════════════════
    private cleanUrl(url: string): string {
        return url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').toLowerCase();
    }

    private async fetchHistory(userId: string): Promise<void> {
        if (!userId) return;

        try {
            // Fetch all past leads for this user that have a website
            // We need to fetch from 'search_results' and extract 'lead_data'
            // NOTE: This could be heavy if history is huge. In production, this should be an Edge Function or optimized SQL.
            // For now, we fetch the last 1000 sessions to keep it performant-ish.
            const { data, error } = await supabase
                .from('search_results_fran')
                .select('lead_data')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) {
                console.error('Error fetching history:', error);
                return;
            }

            const historySet = new Set<string>();

            if (data) {
                data.forEach((row: any) => {
                    const leads = row.lead_data;
                    if (Array.isArray(leads)) {
                        leads.forEach((lead: any) => {
                            if (lead.website) historySet.add(this.cleanUrl(lead.website));
                            if (lead.companyName) historySet.add(lead.companyName.toLowerCase().trim());
                        });
                    }
                });
            }

            this.tabooSet = historySet;
            console.log(`[Anti-Duplicate] Loaded ${this.tabooSet.size} protected entities.`);

        } catch (e) {
            console.error('Failed to load history for deduplication', e);
        }
    }

    // Add new leads to the protection set AFTER saving them
    public addToTabooSet(newLeads: Lead[]): void {
        if (!Array.isArray(newLeads)) return;

        let addedCount = 0;
        newLeads.forEach((lead: Lead) => {
            if (lead.website) {
                const clean = this.cleanUrl(lead.website);
                if (!this.tabooSet.has(clean)) {
                    this.tabooSet.add(clean);
                    addedCount++;
                }
            }
            if (lead.companyName) {
                const cleanName = lead.companyName.toLowerCase().trim();
                if (!this.tabooSet.has(cleanName)) {
                    this.tabooSet.add(cleanName);
                    addedCount++;
                }
            }
        });

        if (addedCount > 0) {
            console.log(`[Anti-Duplicate] Updated: +${addedCount} new entries. Total protected: ${this.tabooSet.size}`);
        }
    }

    // Is this lead already in DB? (Comprehensive check)
    private isDuplicate(lead: Partial<Lead>): boolean {
        // Check by website (primary)
        if (lead.website) {
            const clean = this.cleanUrl(lead.website);
            if (this.tabooSet.has(clean)) {
                console.debug(`[Anti-Dup] Blocked by website: ${clean}`);
                return true;
            }
        }
        
        // Check by company name (secondary)
        if (lead.companyName) {
            const cleanName = lead.companyName.toLowerCase().trim();
            if (this.tabooSet.has(cleanName)) {
                console.debug(`[Anti-Dup] Blocked by company: ${cleanName}`);
                return true;
            }
        }
        
        // Fuzzy check: partial matches (for similar variations)
        if (lead.companyName) {
            const nameVariations = [
                lead.companyName.toLowerCase().trim(),
                lead.companyName.toLowerCase().replace(/,.*/, '').trim(), // Remove location suffixes
                lead.companyName.toLowerCase().replace(/["']/g, '').trim() // Remove quotes
            ];
            
            for (const name of nameVariations) {
                for (const taboo of this.tabooSet) {
                    // Check if either contains the other (naive fuzzy match)
                    if (name.length > 3 && taboo.includes(name) || name.includes(taboo)) {
                        console.debug(`[Anti-Dup] Blocked by fuzzy match: ${name} vs ${taboo}`);
                        return true;
                    }
                }
            }
        }
        
        return false;
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
                            content: `Eres un experto en prospección B2B para Fran: Dueños y Fundadores de Gimnasios, Centros de Fitness, Clínicas de Salud y Bienestar.
Responde SOLO con JSON:
{
  "searchQuery": "término optimizado",
  "industry": "sector detectado",
  "targetRoles": ["CEO", "Fundador", etc],
  "location": "ubicación o España"
}`
                        },
                        { role: 'user', content: `Búsqueda: "${userQuery}"` }
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
    // DEEP RESEARCH - Google Search for company/owner info
    // ═══════════════════════════════════════════════════════════════════════════
    private async deepResearchLead(lead: Lead, onLog: LogCallback): Promise<string> {
        if (!this.isRunning) return '';

        const searchQueries = [];

        // Research company
        if (lead.companyName && lead.companyName !== 'Sin Nombre') {
            searchQueries.push(`"${lead.companyName}" empresa valores misión`);
        }

        // Research owner if we have a name
        if (lead.decisionMaker?.name) {
            searchQueries.push(`"${lead.decisionMaker.name}" ${lead.companyName} entrevista`);
            searchQueries.push(`"${lead.decisionMaker.name}" linkedin`);
        }

        // Research from website
        if (lead.website) {
            searchQueries.push(`site:${lead.website} "sobre nosotros" OR "quiénes somos" OR "about"`);
        }

        if (searchQueries.length === 0) return '';

        try {
            const searchInput = {
                queries: searchQueries.join('\n'),
                maxPagesPerQuery: 1,
                resultsPerPage: 5,
                languageCode: 'es',
                countryCode: 'es',
            };

            const results = await this.callApifyActor(GOOGLE_SEARCH_SCRAPER, searchInput, (msg) => { }); // Silent

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
    // ULTRA-COMPLETE AI ANALYSIS - Psychological + Business + Bottleneck
    // ═══════════════════════════════════════════════════════════════════════════
    private async generateUltraAnalysis(lead: Lead, researchData: string): Promise<{
        fullAnalysis: string;
        psychologicalProfile: string;
        businessMoment: string;
        salesAngle: string;
        personalizedMessage: string;
        bottleneck: string;
    }> {
        if (!this.openaiKey) {
            return {
                fullAnalysis: `${lead.companyName}: ${lead.aiAnalysis?.summary || ''}`,
                psychologicalProfile: 'Análisis no disponible (Sin API Key)',
                businessMoment: 'Desconocido',
                salesAngle: 'Genérico',
                personalizedMessage: '',
                bottleneck: ''
            };
        }

        const context = `
═══ DATOS DEL LEAD ═══
Empresa: ${lead.companyName}
Web: ${lead.website || 'No disponible'}
Ubicación: ${lead.location || 'España'}
Decisor: ${lead.decisionMaker?.name || 'No identificado'}
Cargo: ${lead.decisionMaker?.role || 'Propietario'}
Email: ${lead.decisionMaker?.email || 'No disponible'}
LinkedIn: ${lead.decisionMaker?.linkedin || 'No disponible'}
Resumen inicial: ${lead.aiAnalysis?.summary || ''}

═══ INVESTIGACIÓN ADICIONAL ═══
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
                                content: `Eres un GENIO del análisis de negocios y psicología empresarial. Tu trabajo es hacer el análisis MÁS COMPLETO posible de cada lead para ventas B2B.

SI HAY DATOS DE "ACTIVIDAD RECIENTE (Posts)":
- Analiza su estilo de escritura (Directo, Reflexivo, Técnico, Vendedor).
- Deduce sus valores y qué temas le obsesionan ahora mismo.
- Úsalo para personalizar el mensaje al máximo.

DEBES generar exactamente este JSON (sin markdown, solo JSON puro):
{
  "psychologicalProfile": "Describe su perfil en 2 frases (Ej: 'Visionario y directo. Valora la innovación...')",
  "businessMoment": "Deduce en qué fase está la empresa (Ej: 'Expansión agresiva', 'Consolidación', 'Buscando eficiencia')",
  "salesAngle": "El argumento ÚNICO para venderle a ESTA persona hoy.",
  "bottleneck": "Una frase BRUTAL y específica sobre su mayor freno o cuello de botella detectado.",
  "personalizedMessage": "Mensaje de 100 palabras. Tono 'Coffee Chat' profesional. MENCIONA SU ÚLTIMO POST O ACTIVIDAD si existe."
}

IMPORTANTE: Responde SOLO con JSON válido.`
                            },
                            {
                                role: 'user',
                                content: `Analiza este lead (Intento ${attempt}):\n\n${context}`
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000
                    })
                });

                if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';
                const jsonMatch = content.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        fullAnalysis: `🧠 PERFIL: ${parsed.psychologicalProfile}\n🏢 MOMENTO: ${parsed.businessMoment}\n💡 ÁNGULO: ${parsed.salesAngle}`, // Legacy format for safety
                        psychologicalProfile: parsed.psychologicalProfile || 'No detectado',
                        businessMoment: parsed.businessMoment || 'No detectado',
                        salesAngle: parsed.salesAngle || 'Genérico',
                        personalizedMessage: parsed.personalizedMessage || `Hola ${lead.decisionMaker?.name || 'equipo'}, me gustaría contactar con vosotros.`,
                        bottleneck: parsed.bottleneck || 'Oportunidad de mejora detectada'
                    };
                }
            } catch (e) {
                console.error(`Attempt ${attempt} failed:`, e);
                if (attempt === MAX_RETRIES) break;
                await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
            }
        }

        // Fallback if all AI attempts fail
        return {
            fullAnalysis: `Análisis automático no disponible. Revisar perfil de ${lead.companyName}.`,
            psychologicalProfile: 'No disponible',
            businessMoment: 'Desconocido',
            salesAngle: 'Desconocido',
            personalizedMessage: `Hola ${lead.decisionMaker?.name || 'Responsable'}, he visto vuestra web ${lead.website} y me gustaría comentar una oportunidad de colaboración.`,
            bottleneck: 'Revisión manual requerida'
        };
    }

    private async callApifyActor(actorId: string, input: any, onLog: LogCallback): Promise<any[]> {
        // Use local proxy to avoid CORS
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
        while (!isFinished && this.isRunning && pollCount < 60) {
            await new Promise(r => setTimeout(r, 5000));
            pollCount++;

            const statusRes = await fetch(`${baseUrl}/acts/${actorId}/runs/${runId}?token=${this.apiKey}`);
            const statusData = await statusRes.json();
            const status = statusData.data.status;

            if (pollCount % 4 === 0) onLog(`[APIFY] Estado: ${status}`);

            if (status === 'SUCCEEDED') isFinished = true;
            else if (status === 'FAILED' || status === 'ABORTED') throw new Error(`Actor falló: ${status}`);
        }

        if (!this.isRunning) return [];

        const itemsRes = await fetch(`${baseUrl}/datasets/${defaultDatasetId}/items?token=${this.apiKey}`);
        return await itemsRes.json();
    }

    public async startSearch(config: SearchConfigState, userId: string | null, onLog: LogCallback, onComplete: ResultCallback) {
        this.isRunning = true;

        try {
            this.apiKey = import.meta.env.VITE_APIFY_API_TOKEN || '';
            this.openaiKey = import.meta.env.VITE_OPENAI_API_KEY || '';

            if (!this.apiKey) throw new Error("Falta VITE_APIFY_API_TOKEN en .env");

            // 0. PRE-FLIGHT: Load History
            if (userId) {
                onLog(`[SISTEMA] 🛡️ Cargando historial para evitar duplicados...`);
                await this.fetchHistory(userId);
                onLog(`[SISTEMA] ✅ Protección activa: ${this.tabooSet.size} leads ignorados.`);
            } else {
                this.tabooSet.clear();
            }

            onLog(`[IA] 🧠 Interpretando: "${config.query}"...`);
            const interpreted = await this.interpretQuery(config.query, config.source);
            onLog(`[IA] ✅ Industria: ${interpreted.industry}`);

            if (config.source === 'linkedin') {
                await this.searchLinkedIn(config, interpreted, onLog, onComplete);
            } else {
                await this.searchGmail(config, interpreted, onLog, onComplete);
            }

        } catch (error: any) {
            onLog(`[ERROR] ❌ ${error.message}`);
            onComplete([]);
        } finally {
            this.isRunning = false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GMAIL SEARCH - SMART LOOP WITH PAGINATION
    // ═══════════════════════════════════════════════════════════════════════════
    private async searchGmail(
        config: SearchConfigState,
        interpreted: { searchQuery: string; industry: string; targetRoles: string[]; location: string },
        onLog: LogCallback,
        onComplete: ResultCallback
    ) {
        let query = `${interpreted.searchQuery} ${interpreted.location}`;
        
        // Apply advanced filters to query if available
        if (config.advancedFilters) {
            query = this.buildQueryWithAdvancedFilters(query, config.advancedFilters);
            onLog(`[FILTERS] ✅ Filtros avanzados aplicados a la búsqueda`);
        }
        
        onLog(`[GMAIL] 🗺️ Buscando: "${query}" (Smart Loop x4)...`);

        const targetCount = config.maxResults || 10;
        const validLeads: Lead[] = [];
        let attempts = 0;
        const MAX_ATTEMPTS = 10;
        let totalScannedPreviously = 0;

        // ═══════════════════════════════════════════════════════════════════════════
        // SMART LOOP: Keep iterating until target reached
        // ═══════════════════════════════════════════════════════════════════════════
        while (validLeads.length < targetCount && this.isRunning && attempts < MAX_ATTEMPTS) {
            attempts++;
            const needed = targetCount - validLeads.length;
            const fetchAmount = needed * 4; // Smart multiplier x4

            onLog(`[ATTEMPT ${attempts}] 🔄 Búsqueda: ${fetchAmount} candidatos (faltantes: ${needed})...`);

            // STAGE 1: Google Maps scraping with smart pagination
            const totalMapsToScan = fetchAmount + totalScannedPreviously;

            const mapsResults = await this.callApifyActor(GOOGLE_MAPS_SCRAPER, {
                searchStringsArray: [query],
                maxCrawledPlacesPerSearch: Math.min(totalMapsToScan, 1000),
                language: 'es',
                includeWebsiteEmail: true,
                scrapeContacts: true,
                maxImages: 0,
                maxReviews: 0,
            }, onLog);

            if (mapsResults.length === 0) {
                onLog(`[ATTEMPT ${attempts}] ⚠️ No se encontraron más resultados en Maps.`);
                break; // No more results
            }

            onLog(`[GMAIL] 📊 ${mapsResults.length} empresas encontradas (acumuladas: ${totalScannedPreviously})...`);

            // Update pagination tracker
            totalScannedPreviously += mapsResults.length;

            // Convert to leads and apply deduplication
            let allLeads: Lead[] = [];
            let duplicatesByEmail = 0;
            let duplicatesByWebsite = 0;

            for (const [index, item] of mapsResults.entries()) {
                const tempLead: Lead = {
                    id: String(item.placeId || `lead-${Date.now()}-${attempts}-${index}`),
                    source: 'gmail' as const,
                    companyName: item.title || item.name || 'Sin Nombre',
                    website: item.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '',
                    location: item.address || item.fullAddress || '',
                    decisionMaker: {
                        name: '',
                        role: 'Propietario',
                        email: item.email || (item.emails?.[0]) || '',
                        phone: item.phone || (item.phones?.[0]) || '',
                        linkedin: '',
                        facebook: item.facebook || '',
                        instagram: item.instagram || '',
                    },
                    aiAnalysis: {
                        summary: `${item.categoryName || interpreted.industry} - ${item.reviewsCount || 0} reseñas (${item.totalScore || 'N/A'}⭐)`,
                        painPoints: [],
                        generatedIcebreaker: '',
                        fullMessage: '',
                        fullAnalysis: '',
                        psychologicalProfile: '',
                        businessMoment: '',
                        salesAngle: ''
                    },
                    status: 'scraped' as const
                };

                // CHECK DUPLICATE
                if (this.isDuplicate(tempLead)) {
                    if (tempLead.website && this.tabooSet.has(this.cleanUrl(tempLead.website))) {
                        duplicatesByWebsite++;
                    } else if (tempLead.companyName) {
                        duplicatesByEmail++;
                    }
                    continue;
                }

                // Also check session duplicates
                if (validLeads.some(v => v.website === tempLead.website || v.companyName === tempLead.companyName)) {
                    continue;
                }

                allLeads.push(tempLead);
            }

            if (duplicatesByWebsite > 0 || duplicatesByEmail > 0) {
                onLog(`[ATTEMPT ${attempts}] 🗑️ ${duplicatesByWebsite} + ${duplicatesByEmail} duplicados descartados.`);
            }

            if (allLeads.length === 0) {
                onLog(`[ATTEMPT ${attempts}] ⚠️ Todos descartados por duplicado.`);
                continue; // Try next attempt
            }

            onLog(`[ATTEMPT ${attempts}] ✨ ${allLeads.length} candidatos nuevos.`);

            // STAGE 2: Aggressive Contact Enrichment
            const needEmail = allLeads.filter(l => !l.decisionMaker?.email && l.website);
            const alreadyHasEmail = allLeads.filter(l => l.decisionMaker?.email);

            onLog(`[ATTEMPT ${attempts}] ℹ️ ${alreadyHasEmail.length} con email / ${needEmail.length} necesitan scraping...`);

            if (needEmail.length > 0 && this.isRunning) {
                const BATCH_SIZE = 10;
                const batches = Math.ceil(needEmail.length / BATCH_SIZE);

                for (let i = 0; i < batches && this.isRunning; i++) {
                    const start = i * BATCH_SIZE;
                    const end = start + BATCH_SIZE;
                    const batch = needEmail.slice(start, end);

                    try {
                        const contactResults = await this.callApifyActor(CONTACT_SCRAPER, {
                            startUrls: batch.map(l => ({ url: `https://${l.website}` })),
                            maxRequestsPerWebsite: 3,
                            sameDomainOnly: true,
                            maxCrawlingDepth: 1,
                        }, (msg) => { });

                        for (const contact of contactResults) {
                            const contactUrl = contact.url || '';
                            const match = batch.find(l => {
                                if (!l.website) return false;
                                return contactUrl.includes(l.website.replace('www.', ''));
                            });

                            if (match && contact.emails?.length) {
                                const validEmails = contact.emails.filter((e: string) =>
                                    !e.includes('sentry') && !e.includes('noreply') && !e.includes('wix') && e.includes('@')
                                );

                                if (validEmails.length > 0) {
                                    match.decisionMaker.email = validEmails[0];
                                    onLog(`[GMAIL] 📧 Email: ${validEmails[0]}`);
                                }
                            }
                        }
                    } catch (e: any) {
                        onLog(`[GMAIL] ⚠️ Lote ${i + 1} error: ${e.message}`);
                    }
                }
            }

            // Filter leads with email
            const finalCandidates = allLeads.filter(l => l.decisionMaker?.email);

            if (finalCandidates.length === 0) {
                onLog(`[ATTEMPT ${attempts}] ⚠️ Ninguno tiene email válido.`);
                continue; // Try next attempt
            }

            // Add successful leads to collection
            const slotsRemaining = targetCount - validLeads.length;
            const leadsToAdd = finalCandidates.slice(0, slotsRemaining);

            for (const lead of leadsToAdd) {
                validLeads.push(lead);
                onLog(`[SUCCESS] ✅ Lead ${validLeads.length}/${targetCount}: ${lead.companyName}`);
            }
        } // End Smart Loop

        onLog(`[GMAIL] 📊 Búsqueda completada: ${validLeads.length}/${targetCount} en ${attempts} intentos...`);

        // STAGE 3: AI analysis if needed
        if (this.openaiKey && this.isRunning) {
            const leadsToAnalyze = validLeads.slice(0, targetCount);
            
            for (let i = 0; i < leadsToAnalyze.length && this.isRunning; i++) {
                const lead = leadsToAnalyze[i];
                lead.aiAnalysis.generatedIcebreaker = `Hola, he visto vuestra web ${lead.website}...`;
                lead.status = 'ready';

                if (leadsToAnalyze.length <= 20) {
                    try {
                        const research = await this.deepResearchLead(lead, (m) => { });
                        const analysis = await this.generateUltraAnalysis(lead, research);
                        lead.aiAnalysis.fullAnalysis = analysis.fullAnalysis;
                        lead.aiAnalysis.psychologicalProfile = analysis.psychologicalProfile;
                        lead.aiAnalysis.businessMoment = analysis.businessMoment;
                        lead.aiAnalysis.salesAngle = analysis.salesAngle;
                        lead.aiAnalysis.fullMessage = analysis.personalizedMessage;
                    } catch (e) {
                        lead.aiAnalysis.fullMessage = `Contacto disponible en ${lead.website}`;
                    }
                }
            }
        }

        onLog(`[GMAIL] 🏁 FINALIZADO: ${validLeads.length} leads listos`);
        onComplete(validLeads);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LINKEDIN SEARCH - SMART LOOP WITH PAGINATION
    // ═══════════════════════════════════════════════════════════════════════════
    private async searchLinkedIn(
        config: SearchConfigState,
        interpreted: { searchQuery: string; industry: string; targetRoles: string[]; location: string },
        onLog: LogCallback,
        onComplete: ResultCallback
    ) {
        const targetCount = config.maxResults || 5;
        const validLeads: Lead[] = [];
        let attempts = 0;
        const MAX_ATTEMPTS = 10;
        let currentPage = 1;

        onLog(`[LINKEDIN] 🕵️‍♂️ Iniciando BÚSQUEDA ACTIVA con Smart Loop...`);

        // ═══════════════════════════════════════════════════════════════════════════
        // SMART LOOP: Paginate through results
        // ═══════════════════════════════════════════════════════════════════════════
        while (validLeads.length < targetCount && this.isRunning && attempts < MAX_ATTEMPTS) {
            attempts++;
            const needed = targetCount - validLeads.length;
            const resultsToFetch = needed * 4; // x4 multiplier

            onLog(`[LINKEDIN-ATTEMPT ${attempts}] 🔄 Página ${currentPage}: ${resultsToFetch} resultados...`);

            const roleTerms = interpreted.targetRoles.slice(0, 2).join(' OR ');
            const activeQuery = `site:linkedin.com/in ${roleTerms} "${interpreted.industry}" "${interpreted.location}"`;

            try {
                const searchResults = await this.callApifyActor(GOOGLE_SEARCH_SCRAPER, {
                    queries: activeQuery,
                    maxPagesPerQuery: currentPage,
                    resultsPerPage: resultsToFetch,
                    languageCode: 'es',
                    countryCode: 'es',
                }, onLog);

                let allResults: any[] = [];
                for (const result of searchResults) {
                    if (result.organicResults) allResults = allResults.concat(result.organicResults);
                }

                if (allResults.length === 0) {
                    onLog(`[LINKEDIN-ATTEMPT ${attempts}] ⚠️ No hay más resultados en página ${currentPage}.`);
                    break;
                }

                let linkedInProfiles = allResults.filter((r: any) => r.url?.includes('linkedin.com/in/'));
                onLog(`[DEBUG] 👤 Perfiles encontrados: ${linkedInProfiles.length}`);

                if (linkedInProfiles.length === 0) {
                    onLog(`[LINKEDIN-ATTEMPT ${attempts}] ⚠️ Sin perfiles en esta página.`);
                    break;
                }

                // Filter duplicates from LinkedIn results
                const uniqueProfiles = [];
                let duplicateCounter = 0;
                
                for (const profile of linkedInProfiles) {
                    const tempLead = {
                        website: profile.url,
                        companyName: this.extractCompany(profile.title)
                    } as Partial<Lead>;
                    
                    if (this.isDuplicate(tempLead)) {
                        duplicateCounter++;
                        continue;
                    }

                    // Check session duplicates
                    if (validLeads.some(l => l.companyName === tempLead.companyName)) {
                        continue;
                    }

                    uniqueProfiles.push(profile);
                }

                if (uniqueProfiles.length === 0) {
                    onLog(`[LINKEDIN-ATTEMPT ${attempts}] 🔄 Todos filtrados por duplicado`);
                    currentPage++;
                    continue;
                }

                onLog(`[LINKEDIN-ATTEMPT ${attempts}] ✨ ${uniqueProfiles.length} nuevos (${duplicateCounter} descartados)`);

                // Process profiles
                const POSTS_SCRAPER = 'LQQIXN9Othf8f7R5n';

                for (let i = 0; i < uniqueProfiles.length && this.isRunning; i++) {
                    if (validLeads.length >= targetCount) break;

                    const profile = uniqueProfiles[i];
                    onLog(`[RESEARCH] 🧠 Analizando: ${profile.title.split(' - ')[0]}...`);

                    const titleParts = (profile.title || '').split(' - ');
                    const name = titleParts[0]?.replace(' | LinkedIn', '').trim() || 'Usuario LinkedIn';
                    const role = this.extractRole(profile.title) || 'Decisor';
                    const company = this.extractCompany(profile.title) || 'Empresa Desconocida';

                    let recentPostsText = "";
                    try {
                        const postsData = await this.callApifyActor(POSTS_SCRAPER, {
                            username: profile.url,
                            limit: 3
                        }, () => { });

                        if (postsData && postsData.length > 0) {
                            recentPostsText = postsData.map((p: any) => `${p.text?.substring(0, 150)}...`).join('\n');
                        }
                    } catch (e) {
                        // Silent - posts are optional
                    }

                    const researchDossier = `PERFIL: ${name}\nHeadline: ${profile.title}\nReciente: ${recentPostsText || "N/A"}`;

                    try {
                        const analysis = await this.generateUltraAnalysis({
                            companyName: company,
                            decisionMaker: { name, role, linkedin: profile.url }
                        } as Lead, researchDossier);

                        validLeads.push({
                            id: `linkedin-${Date.now()}-${validLeads.length}`,
                            source: 'linkedin',
                            companyName: company,
                            website: '',
                            location: interpreted.location,
                            decisionMaker: {
                                name,
                                role,
                                email: '',
                                phone: '',
                                linkedin: profile.url
                            },
                            aiAnalysis: {
                                summary: `Psicología: ${analysis.bottleneck}`,
                                fullAnalysis: analysis.fullAnalysis,
                                psychologicalProfile: analysis.psychologicalProfile,
                                businessMoment: analysis.businessMoment,
                                salesAngle: analysis.salesAngle,
                                fullMessage: analysis.personalizedMessage,
                                generatedIcebreaker: analysis.bottleneck,
                                painPoints: []
                            },
                            status: 'ready'
                        });

                        onLog(`[SUCCESS] ✅ Lead ${validLeads.length}/${targetCount}: ${name}`);
                    } catch (e) {
                        onLog(`[RESEARCH] ⚠️ Análisis fallido para ${name}`);
                    }
                }

                currentPage++;

            } catch (error: any) {
                onLog(`[LINKEDIN-ATTEMPT ${attempts}] ❌ Error: ${error.message}`);
                break;
            }
        } // End Smart Loop

        onLog(`[LINKEDIN] 🏁 Búsqueda completada: ${validLeads.length}/${targetCount} en ${attempts} intentos`);
        onComplete(validLeads);
    }

    private extractCompany(text: string): string {
        // Heuristic: "CEO en [Empresa]" or "CEO at [Company]"
        const atMatch = text.match(/\b(en|at|@)\s+([^|\-.,]+)/i);
        if (atMatch && atMatch[2]) return atMatch[2].trim();
        return '';
    }

    private extractRole(text: string): string {
        const lower = text.toLowerCase();
        if (lower.includes('ceo')) return 'CEO';
        if (lower.includes('founder') || lower.includes('fundador')) return 'Fundador';
        if (lower.includes('owner') || lower.includes('propietario')) return 'Propietario';
        if (lower.includes('director')) return 'Director';
        return '';
    }
}

export const searchService = new SearchService();
