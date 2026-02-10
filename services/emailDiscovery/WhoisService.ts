/**
 * INTENTO 5: WHOIS Lookup
 * Obtiene información del registrante del dominio vía APIs públicas
 */

import { CompanyData, EmailDiscoveryResult, WhoisData } from './types';
import { EMAIL_DISCOVERY_CONFIG } from './config';
import { logDiscovery, extractDomain, extractJsonFromText } from './utils';

export class WhoisService {
    /**
     * Descubre email vía WHOIS lookup
     */
    async discoverOwnerEmail(company: CompanyData): Promise<EmailDiscoveryResult | null> {
        const startTime = Date.now();

        try {
            const domain = extractDomain(company.website);
            logDiscovery('WHOIS', '🔍', `Consultando WHOIS: ${domain}`);

            // 1. Intentar con múltiples proveedores
            const whoisData = await this.queryWhois(domain);

            if (!whoisData) {
                logDiscovery('WHOIS', '❌', `No se encontraron datos WHOIS`);
                return null;
            }

            // 2. Extraer email y nombre
            const email = whoisData.registrantEmail || whoisData.adminEmail || whoisData.ownerEmail;
            const name = whoisData.registrantName || whoisData.adminName || whoisData.ownerName || 'Owner';

            if (!email) {
                logDiscovery('WHOIS', '❌', `Sin email en WHOIS`);
                return null;
            }

            logDiscovery('WHOIS', '✓', `WHOIS encontrado: ${email}`);

            return {
                email,
                ownerName: name,
                ownerRole: 'Registrant',
                source: 'whois',
                confidence: 0.70, // Bastante confiable
                metadata: {
                    attemptNumber: 5,
                    timeMs: Date.now() - startTime,
                    raw: whoisData
                }
            };

        } catch (error: any) {
            logDiscovery('WHOIS', '❌', `Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Consulta WHOIS mediante múltiples proveedores
     */
    private async queryWhois(domain: string): Promise<WhoisData | null> {
        // Intentar con whoisjsonapi primero (más confiable)
        const result = await this.queryWhoisJsonApi(domain);
        if (result) return result;

        // Fallback a domainsbot
        return await this.queryDomainsBotApi(domain);
    }

    /**
     * Query a whoisjsonapi.com
     */
    private async queryWhoisJsonApi(domain: string): Promise<WhoisData | null> {
        try {
            logDiscovery('WHOIS', '🔗', `Consultando whoisjsonapi...`);

            const response = await fetch(
                `https://whoisjsonapi.com/api/v1/${domain}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                return null;
            }

            const data = await response.json();

            // Parse response
            return {
                registrantName: data.registrant_name || data.registrant?.name,
                registrantEmail: data.registrant_email || data.registrant?.email,
                adminName: data.admin_name || data.admin?.name,
                adminEmail: data.admin_email || data.admin?.email,
                ownerName: data.owner_name,
                ownerEmail: data.owner_email
            };

        } catch (error: any) {
            logDiscovery('WHOIS', '⚠️', `whoisjsonapi error: ${error.message}`);
            return null;
        }
    }

    /**
     * Query a domainsbot.com (alternativa)
     */
    private async queryDomainsBotApi(domain: string): Promise<WhoisData | null> {
        try {
            logDiscovery('WHOIS', '🔗', `Consultando domainsbot...`);

            const response = await fetch(
                `https://api.domainsbot.com/v2/whois?domain=${domain}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                return null;
            }

            const data = await response.json();

            // Parse response
            return {
                registrantName: data.registrant?.name,
                registrantEmail: data.registrant?.email,
                adminName: data.admin?.name,
                adminEmail: data.admin?.email,
                ownerName: data.owner?.name,
                ownerEmail: data.owner?.email
            };

        } catch (error: any) {
            logDiscovery('WHOIS', '⚠️', `domainsbot error: ${error.message}`);
            return null;
        }
    }
}

export const whoisService = new WhoisService();
