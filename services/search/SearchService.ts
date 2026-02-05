import { Lead, SearchConfigState } from '../../lib/types';

export type LogCallback = (message: string) => void;
export type ResultCallback = (leads: Lead[]) => void;

// Apify Actor IDs
const GOOGLE_MAPS_SCRAPER = 'nwua9Gu5YrADL7ZDj'; // Google Maps Scraper with Emails
const CONTACT_SCRAPER = 'vdrmO1lXCkhbPjE9j'; // Contact Info Scraper
const DECISION_MAKER_FINDER = 'curious_coder/decision-maker-email-extractor';
const LINKEDIN_SEARCH = 'curious_coder/linkedin-search-scraper'; // LinkedIn Search
const LINKEDIN_PROFILE = 'dev_starter/linkedin-people-profile-scraper-rapid-2024'; // LinkedIn Profile Scraper (no cookie)

export class SearchService {
    private isRunning = false;
    private apiKey: string = '';

    public stop() {
        this.isRunning = false;
    }

    private async callApifyActor(actorId: string, input: any, onLog: LogCallback): Promise<any[]> {
        const startUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${this.apiKey}`;

        const startResponse = await fetch(startUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });

        if (!startResponse.ok) {
            const err = await startResponse.text();
            throw new Error(`Error iniciando actor ${actorId}: ${err}`);
        }

        const startData = await startResponse.json();
        const runId = startData.data.id;
        const defaultDatasetId = startData.data.defaultDatasetId;

        onLog(`[APIFY] Actor iniciado (Run: ${runId})`);

        // Poll for completion
        let isFinished = false;
        let pollCount = 0;
        while (!isFinished && this.isRunning && pollCount < 60) { // Max 5 min
            await new Promise(r => setTimeout(r, 5000));
            pollCount++;

            const statusUrl = `https://api.apify.com/v2/acts/${actorId}/runs/${runId}?token=${this.apiKey}`;
            const statusRes = await fetch(statusUrl);
            const statusData = await statusRes.json();
            const status = statusData.data.status;

            if (pollCount % 3 === 0) { // Log every 15s
                onLog(`[APIFY] Estado: ${status}`);
            }

            if (status === 'SUCCEEDED') {
                isFinished = true;
            } else if (status === 'FAILED' || status === 'ABORTED') {
                throw new Error(`Actor falló: ${status}`);
            }
        }

        if (!this.isRunning) return [];

        // Fetch results
        const itemsUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${this.apiKey}`;
        const itemsRes = await fetch(itemsUrl);
        return await itemsRes.json();
    }

    public async startSearch(
        config: SearchConfigState,
        onLog: LogCallback,
        onComplete: ResultCallback
    ) {
        this.isRunning = true;

        try {
            this.apiKey = import.meta.env.VITE_APIFY_API_TOKEN || import.meta.env.VITE_APIFY_API_KEY || '';

            if (!this.apiKey) {
                throw new Error("Falta la API Key de Apify. Configura VITE_APIFY_API_TOKEN en tu .env");
            }

            if (config.source === 'linkedin') {
                await this.searchLinkedIn(config, onLog, onComplete);
            } else {
                await this.searchGmail(config, onLog, onComplete);
            }

        } catch (error: any) {
            console.error(error);
            onLog(`[ERROR] ❌ Fallo crítico: ${error.message}`);
            onComplete([]);
        } finally {
            this.isRunning = false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GMAIL SEARCH (Google Maps + Email Enrichment)
    // ═══════════════════════════════════════════════════════════════════════════
    private async searchGmail(
        config: SearchConfigState,
        onLog: LogCallback,
        onComplete: ResultCallback
    ) {
        const leads: Lead[] = [];
        const query = `${config.query} en España`;
        onLog(`[GMAIL] 🗺️ Buscando en Google Maps: "${query}"`);

        // Stage 1: Google Maps Scraper
        const mapsInput = {
            searchStringsArray: [query],
            maxCrawledPlacesPerSearch: config.maxResults || 20,
            language: 'es',
            includeWebsiteEmail: true,
            scrapeContacts: true,
            maxImages: 0,
            maxReviews: 0,
        };

        const mapsResults = await this.callApifyActor(GOOGLE_MAPS_SCRAPER, mapsInput, onLog);
        onLog(`[GMAIL] ✅ ${mapsResults.length} empresas encontradas`);

        if (!this.isRunning) return;

        // Process results
        const basicLeads: Lead[] = mapsResults.map((item: any, index: number) => ({
            id: String(item.placeId || `lead-${Date.now()}-${index}`),
            source: 'gmail' as const,
            companyName: item.title || item.name || 'Sin Nombre',
            website: item.website?.replace(/^https?:\/\//, '').replace(/\/$/, ''),
            location: item.address || item.fullAddress,
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
                summary: `${item.categoryName || 'Empresa'} con ${item.reviewsCount || 0} reseñas (${item.totalScore || 'N/A'}⭐)`,
                painPoints: [],
                generatedIcebreaker: '',
                fullMessage: ''
            },
            status: item.email ? 'enriched' : 'scraped'
        }));

        // Stage 2: Enrich leads without email
        const leadsWithoutEmail = basicLeads.filter(l => !l.decisionMaker?.email && l.website);

        if (leadsWithoutEmail.length > 0 && this.isRunning) {
            onLog(`[GMAIL] 🔍 Enriqueciendo ${leadsWithoutEmail.length} leads sin email...`);

            const websiteUrls = leadsWithoutEmail.map(l => `https://${l.website}`).slice(0, 10);

            try {
                const contactResults = await this.callApifyActor(CONTACT_SCRAPER, {
                    startUrls: websiteUrls.map(url => ({ url })),
                    maxRequestsPerWebsite: 3,
                    sameDomainOnly: true,
                }, onLog);

                for (const contact of contactResults) {
                    const domain = contact.domain || '';
                    const matchingLead = basicLeads.find(l =>
                        l.website && domain.includes(l.website.replace('www.', ''))
                    );

                    if (matchingLead && matchingLead.decisionMaker) {
                        if (contact.emails?.length > 0) {
                            matchingLead.decisionMaker.email = contact.emails[0];
                            matchingLead.status = 'enriched';
                        }
                        if (contact.phones?.length > 0 && !matchingLead.decisionMaker.phone) {
                            matchingLead.decisionMaker.phone = contact.phones[0];
                        }
                        if (contact.linkedIn) matchingLead.decisionMaker.linkedin = contact.linkedIn;
                        if (contact.facebook) matchingLead.decisionMaker.facebook = contact.facebook;
                        if (contact.instagram) matchingLead.decisionMaker.instagram = contact.instagram;
                    }
                }
                onLog(`[GMAIL] ✅ Enriquecimiento completado`);
            } catch (e: any) {
                onLog(`[GMAIL] ⚠️ Error enriqueciendo: ${e.message}`);
            }
        }

        // Stage 3: Decision Maker finder for top leads
        const topLeads = basicLeads.filter(l => l.decisionMaker?.email && l.website).slice(0, 5);

        if (topLeads.length > 0 && this.isRunning) {
            onLog(`[GMAIL] 👤 Buscando decisores para ${topLeads.length} empresas top...`);

            try {
                const dmResults = await this.callApifyActor(DECISION_MAKER_FINDER, {
                    urls: topLeads.map(l => `https://${l.website}`),
                    maxPagesPerDomain: 5,
                }, onLog);

                for (const dm of dmResults) {
                    const domain = dm.domain || dm.url || '';
                    const matchingLead = basicLeads.find(l =>
                        l.website && domain.includes(l.website.replace('www.', ''))
                    );

                    if (matchingLead?.decisionMaker && dm.decisionMakers?.length > 0) {
                        const topDM = dm.decisionMakers[0];
                        matchingLead.decisionMaker.name = topDM.name || '';
                        matchingLead.decisionMaker.role = topDM.title || topDM.position || 'Propietario';
                        if (topDM.email) matchingLead.decisionMaker.email = topDM.email;
                        if (topDM.linkedin) matchingLead.decisionMaker.linkedin = topDM.linkedin;
                        matchingLead.status = 'ready';
                    }
                }
                onLog(`[GMAIL] ✅ Decisores identificados`);
            } catch (e: any) {
                onLog(`[GMAIL] ⚠️ Error buscando decisores: ${e.message}`);
            }
        }

        // Final stats
        const enrichedCount = basicLeads.filter(l => l.decisionMaker?.email).length;
        const readyCount = basicLeads.filter(l => l.status === 'ready').length;

        onLog(`[GMAIL] 🎯 COMPLETADO: ${basicLeads.length} leads`);
        onLog(`   • ${enrichedCount} con email`);
        onLog(`   • ${readyCount} con decisor identificado`);

        onComplete(basicLeads);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LINKEDIN SEARCH (Business Owners/CEOs)
    // ═══════════════════════════════════════════════════════════════════════════
    private async searchLinkedIn(
        config: SearchConfigState,
        onLog: LogCallback,
        onComplete: ResultCallback
    ) {
        onLog(`[LINKEDIN] 💼 Buscando dueños/CEOs de PYMEs: "${config.query}"`);

        // Build search query for business owners in Spain
        const searchQuery = `${config.query} CEO founder propietario dueño owner Spain España`;

        const searchInput = {
            searchTerms: [searchQuery],
            maxItems: config.maxResults || 20,
            searchType: 'people',
            filterByCountry: 'Spain',
        };

        try {
            const searchResults = await this.callApifyActor(LINKEDIN_SEARCH, searchInput, onLog);
            onLog(`[LINKEDIN] ✅ ${searchResults.length} perfiles encontrados`);

            if (!this.isRunning || searchResults.length === 0) {
                onComplete([]);
                return;
            }

            // Process LinkedIn results into leads
            const leads: Lead[] = searchResults.map((profile: any, index: number) => {
                // Extract company from current position
                const company = profile.currentCompany || profile.companyName || 'Empresa no identificada';
                const role = profile.headline || profile.title || 'Profesional';

                return {
                    id: `linkedin-${Date.now()}-${index}`,
                    source: 'linkedin' as const,
                    companyName: company,
                    website: profile.companyUrl?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '',
                    socialUrl: profile.profileUrl || profile.url,
                    location: profile.location || 'España',
                    decisionMaker: {
                        name: profile.fullName || profile.name || '',
                        role: this.extractRole(role),
                        email: profile.email || '',
                        phone: profile.phone || '',
                        linkedin: profile.profileUrl || profile.url || '',
                        facebook: '',
                        instagram: '',
                    },
                    aiAnalysis: {
                        summary: `${role} en ${company}. ${profile.summary?.substring(0, 100) || ''}`,
                        painPoints: [],
                        generatedIcebreaker: '',
                        fullMessage: ''
                    },
                    status: profile.email ? 'enriched' : 'scraped'
                };
            });

            // Stage 2: Try to get more profile details for top results
            const profilesToEnrich = leads.slice(0, 10).filter(l => l.decisionMaker?.linkedin);

            if (profilesToEnrich.length > 0 && this.isRunning) {
                onLog(`[LINKEDIN] 🔍 Obteniendo detalles de ${profilesToEnrich.length} perfiles...`);

                try {
                    const profileUrls = profilesToEnrich.map(l => l.decisionMaker!.linkedin);

                    const profileResults = await this.callApifyActor(LINKEDIN_PROFILE, {
                        profileUrls: profileUrls,
                    }, onLog);

                    for (const profile of profileResults) {
                        const matchingLead = leads.find(l =>
                            l.decisionMaker?.linkedin?.includes(profile.publicIdentifier || profile.profileUrl)
                        );

                        if (matchingLead?.decisionMaker) {
                            if (profile.email) {
                                matchingLead.decisionMaker.email = profile.email;
                                matchingLead.status = 'enriched';
                            }
                            if (profile.phoneNumbers?.length > 0) {
                                matchingLead.decisionMaker.phone = profile.phoneNumbers[0];
                            }
                            // Update company website if found
                            if (profile.currentCompanyWebsite) {
                                matchingLead.website = profile.currentCompanyWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '');
                            }
                        }
                    }
                    onLog(`[LINKEDIN] ✅ Detalles obtenidos`);
                } catch (e: any) {
                    onLog(`[LINKEDIN] ⚠️ Error obteniendo detalles: ${e.message}`);
                }
            }

            // Final stats
            const withEmail = leads.filter(l => l.decisionMaker?.email).length;
            const withName = leads.filter(l => l.decisionMaker?.name).length;

            onLog(`[LINKEDIN] 🎯 COMPLETADO: ${leads.length} leads`);
            onLog(`   • ${withName} con nombre identificado`);
            onLog(`   • ${withEmail} con email`);

            onComplete(leads);

        } catch (error: any) {
            onLog(`[LINKEDIN] ❌ Error: ${error.message}`);
            onComplete([]);
        }
    }

    private extractRole(headline: string): string {
        const lowerHeadline = headline.toLowerCase();

        if (lowerHeadline.includes('ceo') || lowerHeadline.includes('chief executive')) return 'CEO';
        if (lowerHeadline.includes('founder') || lowerHeadline.includes('fundador')) return 'Fundador';
        if (lowerHeadline.includes('owner') || lowerHeadline.includes('propietario') || lowerHeadline.includes('dueño')) return 'Propietario';
        if (lowerHeadline.includes('director') || lowerHeadline.includes('gerente')) return 'Director';
        if (lowerHeadline.includes('manager')) return 'Manager';
        if (lowerHeadline.includes('co-founder') || lowerHeadline.includes('cofundador')) return 'Co-Fundador';

        return headline.split('|')[0].split('at')[0].trim().substring(0, 40);
    }
}

export const searchService = new SearchService();
