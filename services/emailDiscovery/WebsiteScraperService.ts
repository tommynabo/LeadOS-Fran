/**
 * INTENTO 3: Website Scraping - "Quiénes somos"
 * Scrape de página About/Quiénes somos para extraer nombre del dueño
 */

import { CompanyData, EmailDiscoveryResult } from './types';
import { EMAIL_DISCOVERY_CONFIG } from './config';
import { logDiscovery, extractJsonFromText, getNameParts } from './utils';

export class WebsiteScraperService {
    private openaiApiKey: string;

    constructor() {
        this.openaiApiKey = EMAIL_DISCOVERY_CONFIG.openai.apiKey;
    }

    /**
     * Descubre owner scrapeando página "About" / "Quiénes somos"
     */
    async discoverOwnerEmail(company: CompanyData): Promise<EmailDiscoveryResult | null> {
        const startTime = Date.now();

        try {
            logDiscovery('WEBSCRAPE', '🕷️', `Scrapeando: ${company.website}`);

            // 1. Obtener HTML de la página
            const html = await this.fetchAboutPage(company.website);

            if (!html) {
                logDiscovery('WEBSCRAPE', '❌', `No se pudo acceder al sitio`);
                return null;
            }

            // 2. Usar GPT para extraer nombre del dueño
            const ownerData = await this.extractOwnerWithAI(html, company);

            if (!ownerData || !ownerData.name) {
                logDiscovery('WEBSCRAPE', '❌', `No se encontró nombre del dueño`);
                return null;
            }

            logDiscovery('WEBSCRAPE', '✓', `Dueño encontrado: ${ownerData.name}`);

            // 3. Generar email pattern
            const domain = this.extractDomain(company.website);
            const email = this.generateEmailPattern(ownerData.name, domain);

            return {
                email,
                ownerName: ownerData.name,
                ownerRole: ownerData.role,
                source: 'website_scrape',
                confidence: 0.55, // Menos confiable
                metadata: {
                    attemptNumber: 3,
                    timeMs: Date.now() - startTime,
                    raw: {
                        extractedFrom: 'about_page',
                        htmlLength: html.length
                    }
                }
            };

        } catch (error: any) {
            logDiscovery('WEBSCRAPE', '❌', `Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Obtiene HTML de página About/Quiénes somos
     */
    private async fetchAboutPage(websiteUrl: string): Promise<string | null> {
        try {
            // Asegurar URL con protocolo
            const baseUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;

            // 1. Intenta acceder directo
            let response = await fetch(baseUrl, { 
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            if (response.ok) {
                let html = await response.text();
                
                // 2. Si no encuentra "about" en la homepage, busca link
                if (!html.toLowerCase().includes('about') && !html.toLowerCase().includes('nosotros')) {
                    const aboutUrl = await this.findAboutLink(html, baseUrl);
                    
                    if (aboutUrl) {
                        response = await fetch(aboutUrl, { 
                            headers: { 'User-Agent': 'Mozilla/5.0' }
                        });
                        if (response.ok) {
                            html = await response.text();
                        }
                    }
                }

                return html;
            }

            return null;

        } catch (error: any) {
            logDiscovery('WEBSCRAPE', '⚠️', `Fetch error: ${error.message}`);
            return null;
        }
    }

    /**
     * Busca link a página About en HTML
     */
    private async findAboutLink(html: string, baseUrl: string): Promise<string | null> {
        try {
            const links = ['about', 'nosotros', 'about-us', 'quienes-somos', 'team', 'equipo', 'founders'];
            
            for (const link of links) {
                // Regex simple para encontrar hrefs
                const regex = new RegExp(`href=["']([^"']*${link}[^"']*)["']`, 'i');
                const match = html.match(regex);
                
                if (match && match[1]) {
                    try {
                        return new URL(match[1], baseUrl).toString();
                    } catch {
                        return `${baseUrl}/${match[1]}`;
                    }
                }
            }

            return null;

        } catch (error) {
            return null;
        }
    }

    /**
     * Usa GPT para extraer nombre y rol del dueño de HTML
     */
    private async extractOwnerWithAI(html: string, company: CompanyData): Promise<{
        name: string;
        role: string;
    } | null> {
        try {
            // Tomar solo primeros 4000 caracteres para no exceder límites
            const htmlSnippet = html.substring(0, 4000);

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: EMAIL_DISCOVERY_CONFIG.openai.model,
                    messages: [
                        {
                            role: 'system',
                            content: `Eres extractor de datos de HTML. De este HTML de web de empresa, extrae el nombre y cargo del fundador/dueño/CEO.

Responde SOLO con JSON válido, sin markdown:
{"name": "Juan García", "role": "Founder"}

Si no encuentras, devuelve:
{"name": null, "role": null}`
                        },
                        {
                            role: 'user',
                            content: `Empresa: ${company.name}\n\nHTML:\n${htmlSnippet}`
                        }
                    ],
                    temperature: EMAIL_DISCOVERY_CONFIG.openai.temperature,
                    max_tokens: 100
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            
            const parsed = extractJsonFromText(content);

            if (parsed && parsed.name) {
                return {
                    name: parsed.name,
                    role: parsed.role || 'Owner'
                };
            }

            return null;

        } catch (error: any) {
            logDiscovery('WEBSCRAPE', '⚠️', `GPT error: ${error.message}`);
            return null;
        }
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

    /**
     * Genera patrón de email
     */
    private generateEmailPattern(name: string, domain: string): string {
        const { firstName, lastName } = getNameParts(name);

        if (firstName && lastName) {
            return `${firstName}.${lastName}@${domain}`;
        } else if (firstName) {
            return `${firstName}@${domain}`;
        } else {
            return `founder@${domain}`;
        }
    }
}

export const websiteScraperService = new WebsiteScraperService();
