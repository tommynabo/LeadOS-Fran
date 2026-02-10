/**
 * INTENTO 1: Apify LinkedIn Company Page Scraper
 * Scrape de empleados/fundadores desde LinkedIn Company Pages
 */

import { CompanyData, EmailDiscoveryResult, ApifyLinkedInResult } from './types';
import { EMAIL_DISCOVERY_CONFIG } from './config';
import { logDiscovery, getNameParts, delay } from './utils';

export class ApifyLinkedInService {
    private apiToken: string;
    private baseUrl = '/api/apify'; // Proxy local para evitar CORS

    constructor() {
        this.apiToken = EMAIL_DISCOVERY_CONFIG.apify.apiToken;
    }

    /**
     * Busca fundadores/CEOs en LinkedIn Company Page
     */
    async discoverOwnerEmail(company: CompanyData): Promise<EmailDiscoveryResult | null> {
        const startTime = Date.now();

        try {
            logDiscovery('LINKEDIN', '🔍', `Buscando en LinkedIn: ${company.name}`);

            // 1. Buscar empresa en LinkedIn
            const linkedinCompanyUrl = await this.searchLinkedInCompany(company.name, company.location);
            
            if (!linkedinCompanyUrl) {
                logDiscovery('LINKEDIN', '❌', `No encontrada empresa en LinkedIn`);
                return null;
            }

            logDiscovery('LINKEDIN', '✓', `Empresa encontrada: ${linkedinCompanyUrl}`);

            // 2. Scrape de empleados (Apify)
            const employees = await this.scrapeLinkedInEmployees(linkedinCompanyUrl);

            if (!employees || employees.length === 0) {
                logDiscovery('LINKEDIN', '❌', `Sin empleados scrapeables`);
                return null;
            }

            // 3. Filtrar por rol (Founder, CEO, Owner)
            const owner = this.filterForOwner(employees);

            if (!owner) {
                logDiscovery('LINKEDIN', '❌', `No se encontró fundador/CEO`);
                return null;
            }

            logDiscovery('LINKEDIN', '✓', `Encontrado: ${owner.name} (${owner.title})`);

            // 4. Inferir email pattern
            const email = await this.inferEmailFromLinkedIn(owner, company);

            if (!email) {
                logDiscovery('LINKEDIN', '❌', `No se pudo inferir email`);
                return null;
            }

            return {
                email,
                ownerName: owner.name,
                ownerRole: this.extractRole(owner.title),
                source: 'apify_linkedin',
                confidence: 0.75, // Bastante confiable
                linkedinProfile: owner.url,
                recentPosts: owner.posts,
                metadata: {
                    attemptNumber: 1,
                    timeMs: Date.now() - startTime,
                    raw: owner
                }
            };

        } catch (error: any) {
            logDiscovery('LINKEDIN', '❌', `Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Busca URL de empresa en LinkedIn
     */
    private async searchLinkedInCompany(companyName: string, location: string): Promise<string | null> {
        try {
            // Usar Google Search con dork de LinkedIn
            const query = `site:linkedin.com/company "${companyName}" ${location}`;
            
            const response = await fetch(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
            const html = await response.text();

            // Parse básico: buscar primer link de linkedin.com/company
            const match = html.match(/https:\/\/linkedin\.com\/company\/[^"&<>]*/);
            return match ? match[0] : null;

        } catch (error) {
            return null;
        }
    }

    /**
     * Scrape de empleados vía Apify
     */
    private async scrapeLinkedInEmployees(linkedinCompanyUrl: string): Promise<ApifyLinkedInResult[]> {
        try {
            // Llamar a Apify con el actor ID
            const actorId = 'apify/linkedin-company-scraper'; // Usar el correctamente
            
            const response = await fetch(
                `${this.baseUrl}/acts/${actorId}/runs?token=${this.apiToken}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        startUrls: [{ url: linkedinCompanyUrl }],
                        maxEmployees: 50, // Limitar para velocidad
                        includeContactInfo: true
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Apify error: ${response.status}`);
            }

            const data = await response.json();
            const runId = data.data.id;
            const datasetId = data.data.defaultDatasetId;

            // Esperar a que termine
            await this.waitForActorComplete(runId, actorId);

            // Obtener resultados
            const itemsRes = await fetch(
                `${this.baseUrl}/datasets/${datasetId}/items?token=${this.apiToken}`
            );

            const items = await itemsRes.json();
            return items as ApifyLinkedInResult[];

        } catch (error: any) {
            logDiscovery('LINKEDIN', '❌', `Apify error: ${error.message}`);
            return [];
        }
    }

    /**
     * Espera a que el actor de Apify termine
     */
    private async waitForActorComplete(runId: string, actorId: string): Promise<void> {
        let isFinished = false;
        let attempts = 0;
        const maxAttempts = 30; // 5 minutos máximo

        while (!isFinished && attempts < maxAttempts) {
            await delay(10000); // Esperar 10 segundos
            attempts++;

            try {
                const res = await fetch(
                    `/api/apify/acts/${actorId}/runs/${runId}?token=${this.apiToken}`
                );
                const data = await res.json();
                const status = data.data.status;

                if (status === 'SUCCEEDED') {
                    isFinished = true;
                } else if (status === 'FAILED' || status === 'ABORTED') {
                    throw new Error(`Actor falló: ${status}`);
                }
            } catch (error) {
                logDiscovery('LINKEDIN', '⚠️', `Esperando Apify... intento ${attempts}`);
            }
        }

        if (!isFinished) {
            throw new Error('Timeout esperando Apify');
        }
    }

    /**
     * Filtra para encontrar al dueño/fundador
     */
    private filterForOwner(employees: ApifyLinkedInResult[]): ApifyLinkedInResult | null {
        const ownerRoles = ['founder', 'ceo', 'owner', 'presidente', 'administrador'];

        for (const emp of employees) {
            const role = emp.title.toLowerCase();
            if (ownerRoles.some(r => role.includes(r))) {
                return emp;
            }
        }

        // Fallback: si no hay founder/CEO, devuelve el primero
        return employees[0] || null;
    }

    /**
     * Extrae rol de título de LinkedIn
     */
    private extractRole(title: string): string {
        const roleKeywords: { [key: string]: string } = {
            'founder': 'Fundador',
            'ceo': 'CEO',
            'owner': 'Propietario',
            'president': 'Presidente',
            'director': 'Director General',
            'manager': 'Manager'
        };

        const lower = title.toLowerCase();
        for (const [keyword, role] of Object.entries(roleKeywords)) {
            if (lower.includes(keyword)) return role;
        }

        return 'Decisor';
    }

    /**
     * Intenta inferir email basado en perfil de LinkedIn
     */
    private async inferEmailFromLinkedIn(
        owner: ApifyLinkedInResult,
        company: CompanyData
    ): Promise<string | null> {
        // Generar patrón de email basado en nombre y dominio
        const domain = company.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        const nameParts = getNameParts(owner.name);

        // Intentar patrones comunes
        const patterns = [
            `${nameParts.firstName}.${nameParts.lastName}@${domain}`,
            `${nameParts.firstName[0]}.${nameParts.lastName}@${domain}`,
            `${nameParts.firstName}@${domain}`,
            `founder@${domain}`
        ];

        // Devuelve el patrón más probable (el primero)
        return patterns[0];
    }
}

export const apifyLinkedInService = new ApifyLinkedInService();
