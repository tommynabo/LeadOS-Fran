/**
 * INTENTO 2: Google Dorks - Búsquedas avanzadas
 * Usa Google Custom Search para encontrar name@domain patterns y LinkedIn profiles
 */

import { CompanyData, EmailDiscoveryResult, GoogleDoorkResult } from './types';
import { EMAIL_DISCOVERY_CONFIG } from './config';
import { logDiscovery, extractEmailsFromText, filterSpamEmails, getNameParts } from './utils';

export class GoogleDorksService {
    private apiKey: string;
    private searchEngineId: string;
    private queriesMadeToday = 0;

    constructor() {
        this.apiKey = EMAIL_DISCOVERY_CONFIG.google.apiKey;
        this.searchEngineId = EMAIL_DISCOVERY_CONFIG.google.customSearchEngineId;
    }

    /**
     * Descubre email usando Google Dorks
     */
    async discoverOwnerEmail(company: CompanyData, ownerName?: string): Promise<EmailDiscoveryResult | null> {
        const startTime = Date.now();

        try {
            logDiscovery('DORKS', '🔍', `Buscando dueño: ${company.name}`);

            // Si no tenemos nombre del dueño, buscamos fundador genérico
            const searchName = ownerName || 'founder';

            // Construir búsquedas progresivamente específicas
            const queries = this.buildQueries(searchName, company);

            for (const query of queries) {
                logDiscovery('DORKS', '🔎', `Query: ${query}`);

                const results = await this.googleSearch(query);

                if (!results || results.length === 0) {
                    continue;
                }

                // Buscar email en resultados
                const emails = this.extractEmailsFromResults(results);
                const cleanEmails = filterSpamEmails(emails);

                if (cleanEmails.length > 0) {
                    logDiscovery('DORKS', '✓', `Email encontrado: ${cleanEmails[0]}`);

                    return {
                        email: cleanEmails[0],
                        ownerName: ownerName || 'Fundador',
                        ownerRole: 'Owner',
                        source: 'google_dorks',
                        confidence: 0.65, // Menos confiable que LinkedIn
                        linkedinProfile: this.extractLinkedInProfile(results),
                        metadata: {
                            attemptNumber: 2,
                            timeMs: Date.now() - startTime,
                            raw: {
                                query,
                                resultsCount: results.length
                            }
                        }
                    };
                }

                // Si encontramos LinkedIn, podemos usarlo en otros intentos
                const linkedinProfile = this.extractLinkedInProfile(results);
                if (linkedinProfile && !ownerName) {
                    // Reintentar con nombre extraído
                    logDiscovery('DORKS', '📝', `Perfil LinkedIn hallado, reintentando...`);
                    continue;
                }
            }

            logDiscovery('DORKS', '❌', `No se encontró información`);
            return null;

        } catch (error: any) {
            logDiscovery('DORKS', '❌', `Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Construye queries progresivamente específicas
     */
    private buildQueries(ownerName: string, company: CompanyData): string[] {
        const domain = company.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        const { firstName, lastName } = getNameParts(ownerName);

        return [
            // Más específicas primero
            `"${ownerName}" "${company.name}" email`,
            `"${firstName}" "#{lastName}" "${company.name}" @${domain}`,
            `"${company.name}" founder "${ownerName}"`,
            `site:linkedin.com/in "${ownerName}" "${company.name}"`,
            
            // Variaciones
            `founder "${company.name}" email`,
            `CEO "${company.name}" linkedin`,
            `"${company.name}" owner contact`,
            `site:crunchbase.com "${ownerName}" "${company.name}"`,
            
            // Genéricas
            `"${company.name}" founder`,
            `"${company.name}" CEO`
        ];
    }

    /**
     * Ejecuta búsqueda en Google Custom Search
     */
    private async googleSearch(query: string): Promise<GoogleDoorkResult[]> {
        try {
            // Verificar límite diario
            if (this.queriesMadeToday >= EMAIL_DISCOVERY_CONFIG.google.maxQueriesPerDay) {
                logDiscovery('DORKS', '⚠️', `Límite diario de Google alcanzado`);
                return [];
            }

            const response = await fetch(
                `https://www.googleapis.com/customsearch/v1?` +
                `q=${encodeURIComponent(query)}&` +
                `cx=${this.searchEngineId}&` +
                `key=${this.apiKey}&` +
                `num=10` // Máximo 10 resultados por query
            );

            if (!response.ok) {
                if (response.status === 403) {
                    logDiscovery('DORKS', '⚠️', `Límite de API alcanzado o key inválida`);
                }
                throw new Error(`Google API error: ${response.status}`);
            }

            const data = await response.json();
            this.queriesMadeToday++;

            // Mapear resultados
            return (data.items || []).map((item: any) => ({
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                email: undefined // Se extraerá después
            }));

        } catch (error: any) {
            logDiscovery('DORKS', '⚠️', `Google search error: ${error.message}`);
            return [];
        }
    }

    /**
     * Extrae emails de resultados de búsqueda
     */
    private extractEmailsFromResults(results: GoogleDoorkResult[]): string[] {
        const emails: string[] = [];

        for (const result of results) {
            // Buscar en título
            const titleEmails = extractEmailsFromText(result.title);
            emails.push(...titleEmails);

            // Buscar en snippet
            const snippetEmails = extractEmailsFromText(result.snippet);
            emails.push(...snippetEmails);
        }

        // Deduplicar y filtrar
        return Array.from(new Set(emails));
    }

    /**
     * Extrae perfil de LinkedIn de resultados
     */
    private extractLinkedInProfile(results: GoogleDoorkResult[]): string | undefined {
        for (const result of results) {
            if (result.url.includes('linkedin.com/in/')) {
                return result.url;
            }
        }
        return undefined;
    }

    /**
     * Reset de contador (debería llamarse cada día)
     */
    public resetDailyCounter(): void {
        this.queriesMadeToday = 0;
    }

    /**
     * Get contador actual
     */
    public getQueriesUsed(): number {
        return this.queriesMadeToday;
    }
}

export const googleDorksService = new GoogleDorksService();
