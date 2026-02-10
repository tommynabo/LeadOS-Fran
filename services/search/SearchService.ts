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
        while (!isFinished && this.isRunning && pollCount < 120) { // Increased timeout
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
            onLog(`[IA] 🧠 Analizando estrategia para: "${config.query}"...`);
            const interpreted = await this.interpretQuery(config.query, config.source);

            if (config.source === 'linkedin') {
                await this.searchLinkedIn(config, interpreted, onLog, onComplete);
            } else {
                await this.searchGmailWithYieldGuarantee(config, interpreted, onLog, onComplete);
            }

        } catch (error: any) {
            onLog(`[ERROR] ❌ ${error.message}`);
            onComplete([]);
        } finally {
            this.isRunning = false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GMAIL SEARCH LOOP - GUARANTEED YIELD
    // ═══════════════════════════════════════════════════════════════════════════
    private async searchGmailWithYieldGuarantee(
        config: SearchConfigState,
        interpreted: { searchQuery: string; industry: string; location: string },
        onLog: LogCallback,
        onComplete: ResultCallback
    ) {
        const targetCount = config.maxResults || 5;
        const validLeads: Lead[] = [];
        let loopCount = 0;
        const MAX_LOOPS = 5; // Safety break

        onLog(`[SYSTEM] 🎯 Objetivo: ${targetCount} leads cualificados (Dueño + Email).`);
        onLog(`[SYSTEM] 🔄 Iniciando bucle de búsqueda con Garantía de Resultados...`);

        // 0. PRE-FLIGHT: Fetch ALL existing websites for this user to prevent duplicates
        const existingWebsites = new Set<string>();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('search_results_fran')
                    .select('lead_data')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (data) {
                    data.forEach((row: any) => {
                        if (Array.isArray(row.lead_data)) {
                            row.lead_data.forEach((l: any) => {
                                if (l.website) existingWebsites.add(l.website.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''));
                                if (l.companyName) existingWebsites.add(l.companyName.toLowerCase());
                            });
                        }
                    });
                }
                onLog(`[SYSTEM] 🛡️ Sistema Anti-Duplicados activado. ${existingWebsites.size} empresas en lista negra.`);
            }
        } catch (e) {
            console.error('Error fetching duplicates', e);
        }

        while (validLeads.length < targetCount && this.isRunning && loopCount < MAX_LOOPS) {
            loopCount++;
            const needed = targetCount - validLeads.length;

            // Over-fetch factor: INCREASED TO 10x for maximum yield guarantee
            const fetchAmount = needed * 10;

            onLog(`[LOOP ${loopCount}] 🔍 Buscando ${fetchAmount} candidatos en Maps para obtener ${needed} válidos...`);

            const query = `${interpreted.searchQuery} ${interpreted.location}`;

            // Call Maps Scraper
            const mapsResults = await this.callApifyActor(GOOGLE_MAPS_SCRAPER, {
                searchStringsArray: [query],
                maxCrawledPlacesPerSearch: fetchAmount,
                language: 'es',
                includeWebsiteEmail: true,
                scrapeContacts: true,
                skipClosedPlaces: true, // Don't want closed businesses
            }, (msg) => { }); // Silent sub-logs

            onLog(`[LOOP ${loopCount}] 📊 Maps devolvió ${mapsResults.length} candidatos.`);

            // Filter out those already found
            const newCandidates = mapsResults.filter((m: any) => {
                // 1. Check local duplicates in this batch
                const isLocalDuplicate = validLeads.some(l => l.companyName === m.title || (m.website && l.website === m.website));

                // 2. Check GLOBAL duplicates (Supabase history)
                const cleanWeb = m.website?.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
                const cleanName = m.title?.toLowerCase();
                const isGlobalDuplicate = existingWebsites.has(cleanWeb) || existingWebsites.has(cleanName);

                if (isGlobalDuplicate) {
                    return false;
                }

                return !isLocalDuplicate;
            });

            if (newCandidates.length === 0) {
                onLog(`[LOOP ${loopCount}] ⚠️ Todos los candidatos encontrados ya existen o están duplicados.`);
                break;
            }

            // Convert and process
            const rawLeads: Lead[] = newCandidates.map((item: any, idx: number) => ({
                id: `lead-${Date.now()}-${loopCount}-${idx}`,
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
            onLog(`[LOOP ${loopCount}] 📉 ${candidatesWithWeb.length} candidatos tienen web. Procediendo a enriquecimiento...`);

            // ═══════════════════════════════════════════════════════════════════════════
            // STAGE 2.5: ADVANCED OWNER DISCOVERY (The "Sniper" Phase)
            // ═══════════════════════════════════════════════════════════════════════════
            const leadsToEnrich = candidatesWithWeb;

            if (leadsToEnrich.length > 0) {
                onLog(`[LOOP ${loopCount}] 🕵️‍♂️ Iniciando Protocolo "Sniper" (Email Discovery) para ${leadsToEnrich.length} empresas...`);

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
                    onLog(`[LOOP ${loopCount}] 🕸️ Escaneando webs (Fallback) para ${needsEmail.length} empresas...`);
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
            onLog(`[LOOP ${loopCount}] ✅ ${successfulLeads.length} leads conseguidos con Email.`);

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
        }

        if (validLeads.length < targetCount) {
            onLog(`[WARNING] ⚠️ Solo se pudieron encontrar ${validLeads.length} leads cualificados tras varios intentos.`);
        } else {
            onLog(`[FINISH] 🏁 Objetivo conseguido: ${validLeads.length} leads entregados.`);
        }

        onComplete(validLeads);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LINKEDIN SEARCH (Via Google X-Ray)
    // ═══════════════════════════════════════════════════════════════════════════
    private async searchLinkedIn(
        config: SearchConfigState,
        interpreted: { searchQuery: string; industry: string; targetRoles: string[]; location: string },
        onLog: LogCallback,
        onComplete: ResultCallback
    ) {
        onLog(`[LINKEDIN] 🚀 Iniciando búsqueda X-Ray en Google...`);

        const queries = interpreted.targetRoles.map(role =>
            `site:linkedin.com/in/ "${role}" "${interpreted.industry}" ${interpreted.location}`
        );

        // Join first 2 queries to avoid too many requests, or just use the main one
        const mainQuery = queries[0];

        onLog(`[LINKEDIN] 🔎 Query: ${mainQuery}`);

        try {
            const results = await this.callApifyActor(GOOGLE_SEARCH_SCRAPER, {
                queries: queries.slice(0, 2).join('\n'), // Use top 2 variations
                resultsPerPage: config.maxResults + 5, // Fetch a bit more
                countryCode: 'es',
                languageCode: 'es',
                maxPagesPerQuery: 1,
            }, onLog);

            const leads: Lead[] = [];

            for (const run of results) {
                if (!run.organicResults) continue;

                for (const item of run.organicResults) {
                    if (leads.length >= config.maxResults) break;

                    // Parse Title: "Nombre Apellido - Cargo - Empresa | LinkedIn"
                    const title = item.title;
                    const parts = title.split(' - ');
                    const name = parts[0] || 'Usuario LinkedIn';
                    const role = parts[1] || 'Cargo desconocido';
                    const company = parts[2]?.replace('| LinkedIn', '').trim() || 'Empresa desconocida';

                    const lead: Lead = {
                        id: `li-${Date.now()}-${leads.length}`,
                        source: 'linkedin',
                        companyName: company,
                        website: '', // LinkedIn usually doesn't give website directly in snippet
                        decisionMaker: {
                            name: name,
                            role: role,
                            email: '', // Hard to get email from X-Ray
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

                    leads.push(lead);
                }
            }

            onLog(`[LINKEDIN] ✅ Se encontraron ${leads.length} perfiles.`);

            // Enrich with "Sniper" if we have company name
            // ... (For now, just return what we have as per "Fast" mode)

            onComplete(leads);

        } catch (e: any) {
            onLog(`[ERROR] LinkedIn Search Failed: ${e.message}`);
            onComplete([]);
        }
    }
}

export const searchService = new SearchService();
