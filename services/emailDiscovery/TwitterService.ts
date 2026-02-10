/**
 * INTENTO 6: Twitter/X Company Account
 * Busca fundador verificado en cuenta de Twitter de la empresa
 */

import { CompanyData, EmailDiscoveryResult } from './types';
import { EMAIL_DISCOVERY_CONFIG } from './config';
import { logDiscovery, delay } from './utils';

export class TwitterService {
    private apiToken: string;
    private baseUrl = '/api/apify';

    constructor() {
        this.apiToken = EMAIL_DISCOVERY_CONFIG.apify.apiToken;
    }

    /**
     * Descubre owner buscando en Twitter de la empresa
     */
    async discoverOwnerEmail(company: CompanyData): Promise<EmailDiscoveryResult | null> {
        const startTime = Date.now();

        try {
            logDiscovery('TWITTER', '🐦', `Buscando cuenta de empresa: ${company.name}`);

            // 1. Encontrar cuenta oficial de empresa en Twitter
            const twitterHandle = await this.findCompanyTwitterAccount(company);

            if (!twitterHandle) {
                logDiscovery('TWITTER', '❌', `No encontrada cuenta de Twitter`);
                return null;
            }

            logDiscovery('TWITTER', '✓', `Cuenta encontrada: @${twitterHandle}`);

            // 2. Scrape de bio para encontrar fundador
            const founderData = await this.findFounderFromTwitterBio(twitterHandle, company);

            if (!founderData) {
                logDiscovery('TWITTER', '❌', `Sin información de fundador`);
                return null;
            }

            logDiscovery('TWITTER', '✓', `Fundador encontrado: ${founderData.name}`);

            // 3. Generar email pattern
            const domain = this.extractDomain(company.website);
            const email = `${founderData.name.toLowerCase().replace(' ', '.')}@${domain}`;

            return {
                email,
                ownerName: founderData.name,
                ownerRole: founderData.role,
                source: 'twitter',
                confidence: 0.60,
                twitterHandle: founderData.twitterHandle,
                metadata: {
                    attemptNumber: 6,
                    timeMs: Date.now() - startTime,
                    raw: founderData
                }
            };

        } catch (error: any) {
            logDiscovery('TWITTER', '❌', `Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Busca cuenta oficial de empresa en Twitter
     */
    private async findCompanyTwitterAccount(company: CompanyData): Promise<string | null> {
        try {
            // Aquí normalmente usarías Apify Twitter scraper
            // Para este MVP, intentamos URL directa

            // Patrones comunes
            const handles = [
                company.name.toLowerCase().replace(/\s+/g, ''),
                company.name.toLowerCase().replace(/\s+/g, '_'),
                company.name.toLowerCase().split(' ')[0],
                // URL del dominio también podría tener pista
            ];

            for (const handle of handles) {
                // Verificar si la cuenta existe
                const exists = await this.verifyTwitterHandle(handle);
                if (exists) {
                    return handle;
                }
            }

            return null;

        } catch (error) {
            return null;
        }
    }

    /**
     * Verifica si handle de Twitter existe
     */
    private async verifyTwitterHandle(handle: string): Promise<boolean> {
        try {
            // En un navegador no puedes acceder a Twitter directamente sin CORS
            // Esto requerería un backend proxy
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Encuentra fundador en bio de Twitter
     */
    private async findFounderFromTwitterBio(
        twitterHandle: string,
        company: CompanyData
    ): Promise<{
        name: string;
        role: string;
        twitterHandle?: string;
    } | null> {
        try {
            logDiscovery('TWITTER', '📝', `Obteniendo bio de @${twitterHandle}`);

            // Usar Apify Twitter scraper
            const actorId = EMAIL_DISCOVERY_CONFIG.apify.twitterScraperId;

            const response = await fetch(
                `${this.baseUrl}/acts/${actorId}/runs?token=${this.apiToken}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        startUrls: [{ url: `https://twitter.com/${twitterHandle}` }],
                        includeProfileData: true,
                        maxTweets: 1
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Apify error: ${response.status}`);
            }

            const data = await response.json();
            const runId = data.data.id;
            const datasetId = data.data.defaultDatasetId;

            // Esperar a que termine (timeout simple)
            await delay(20000); // Esperar hasta 20 segundos

            // Obtener datos
            const itemsRes = await fetch(
                `${this.baseUrl}/datasets/${datasetId}/items?token=${this.apiToken}`
            );

            if (!itemsRes.ok) {
                throw new Error('No data from Apify');
            }

            const items = await itemsRes.json();

            if (!items || items.length === 0) {
                return null;
            }

            const profileData = items[0];

            // Buscar menciones de "founder", "CEO", etc en bio
            const bio = profileData.bio || '';
            const isFounder = /founder|creator|created|ceo|chief|owner/i.test(bio);

            if (isFounder || profileData.verified) {
                return {
                    name: profileData.name || twitterHandle,
                    role: this.extractRoleFromBio(bio),
                    twitterHandle: twitterHandle
                };
            }

            return null;

        } catch (error: any) {
            logDiscovery('TWITTER', '⚠️', `Twitter scrape error: ${error.message}`);
            return null;
        }
    }

    /**
     * Extrae rol de la bio de Twitter
     */
    private extractRoleFromBio(bio: string): string {
        if (/founder|creator|created/i.test(bio)) return 'Founder';
        if (/ceo|chief executive/i.test(bio)) return 'CEO';
        if (/owner|prop/i.test(bio)) return 'Owner';
        if (/director|exec/i.test(bio)) return 'Director';
        return 'Owner';
    }

    /**
     * Extrae dominio de URL
     */
    private extractDomain(url: string): string {
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return url.replace('www.', '').split('/')[0];
        }
    }
}

export const twitterService = new TwitterService();
