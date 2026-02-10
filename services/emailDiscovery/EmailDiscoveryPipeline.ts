/**
 * Email Discovery Pipeline - Orquestador Principal
 * Ejecuta los 7 intentos en cascada hasta encontrar email
 */

import { CompanyData, EmailDiscoveryResult, DiscoveryLog } from './types';
import { EMAIL_DISCOVERY_CONFIG, validateConfig } from './config';
import { logDiscovery, delay } from './utils';

import { apifyLinkedInService } from './ApifyLinkedInService';
import { googleDorksService } from './GoogleDorksService';
import { websiteScraperService } from './WebsiteScraperService';
import { emailPatternGeneratorService } from './EmailPatternGeneratorService';
import { whoisService } from './WhoisService';
import { twitterService } from './TwitterService';
import { smtpValidatorService } from './SmtpValidatorService';

export type DiscoveryLogCallback = (log: DiscoveryLog) => void;

export class EmailDiscoveryPipeline {
    private isRunning = false;
    private logs: DiscoveryLog[] = [];
    private logCallback?: DiscoveryLogCallback;

    /**
     * Inicia el pipeline de descubrimiento
     * @param company Datos de la empresa
     * @param onLog Callback para logs (opcional)
     * @returns Resultado del descubrimiento o null
     */
    async discoverOwnerEmail(
        company: CompanyData,
        onLog?: DiscoveryLogCallback
    ): Promise<EmailDiscoveryResult | null> {
        // Validar configuración
        const config = validateConfig();
        if (!config.valid) {
            console.error('❌ Configuración incompleta. Revisa .env.local');
            return null;
        }

        this.isRunning = true;
        this.logs = [];
        this.logCallback = onLog;

        try {
            this.log(0, 'searching', `🚀 Iniciando pipeline para: ${company.name}`);

            const attemptOrder = EMAIL_DISCOVERY_CONFIG.pipeline.attemptOrder;
            let attemptNumber = 0;

            // Ejecutar intentos en orden
            for (const source of attemptOrder) {
                if (!this.isRunning) break;

                attemptNumber++;
                this.log(attemptNumber, 'searching', `Intento ${attemptNumber}: ${source}`);

                let result: EmailDiscoveryResult | null = null;

                // Ejecutar servicio correspondiente
                switch (source) {
                    case 'apify_linkedin':
                        result = await this.executeWithTimeout(
                            apifyLinkedInService.discoverOwnerEmail(company),
                            EMAIL_DISCOVERY_CONFIG.pipeline.timeouts.apify_linkedin
                        );
                        break;

                    case 'google_dorks':
                        result = await this.executeWithTimeout(
                            googleDorksService.discoverOwnerEmail(company),
                            EMAIL_DISCOVERY_CONFIG.pipeline.timeouts.google_dorks
                        );
                        break;

                    case 'website_scrape':
                        result = await this.executeWithTimeout(
                            websiteScraperService.discoverOwnerEmail(company),
                            EMAIL_DISCOVERY_CONFIG.pipeline.timeouts.website_scrape
                        );
                        break;

                    case 'email_pattern':
                        result = await this.executeWithTimeout(
                            emailPatternGeneratorService.discoverOwnerEmail(company),
                            EMAIL_DISCOVERY_CONFIG.pipeline.timeouts.email_pattern
                        );
                        break;

                    case 'whois':
                        result = await this.executeWithTimeout(
                            whoisService.discoverOwnerEmail(company),
                            EMAIL_DISCOVERY_CONFIG.pipeline.timeouts.whois
                        );
                        break;

                    case 'twitter':
                        result = await this.executeWithTimeout(
                            twitterService.discoverOwnerEmail(company),
                            EMAIL_DISCOVERY_CONFIG.pipeline.timeouts.twitter
                        );
                        break;

                    case 'smtp_validation':
                        // Este intento es especial: valida los resultados previos
                        if (result?.email) {
                            const validated = await this.executeWithTimeout(
                                smtpValidatorService.validateEmail(result.email),
                                EMAIL_DISCOVERY_CONFIG.pipeline.timeouts.smtp_validation
                            );
                            if (validated?.isValid) {
                                result.confidence = Math.max(result.confidence, validated.confidence);
                            }
                        }
                        break;

                    case 'fallback':
                        // Email genérico si nada funciona
                        result = this.generateFallbackEmail(company);
                        break;
                }

                // Si encontramos resultado
                if (result) {
                    this.log(attemptNumber, 'found', `✅ Email encontrado: ${result.email}`);

                    if (EMAIL_DISCOVERY_CONFIG.pipeline.stopOnFirstSuccess) {
                        this.log(attemptNumber, 'found', `🏁 Pipeline completado`);
                        return result;
                    }
                }

                // Pequeño delay entre intentos
                await delay(500);
            }

            this.log(0, 'failed', `❌ No se encontró email`);
            return null;

        } catch (error: any) {
            this.log(0, 'failed', `❌ Error crítico: ${error.message}`);
            return null;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Ejecuta una promesa con timeout
     */
    private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
        return Promise.race([
            promise,
            new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs))
        ]);
    }

    /**
     * Genera email fallback genérico
     */
    private generateFallbackEmail(company: CompanyData): EmailDiscoveryResult {
        const domain = company.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

        return {
            email: `contact@${domain}`,
            ownerName: 'Unknown',
            ownerRole: 'Owner',
            source: 'fallback',
            confidence: 0.1,
            metadata: {
                attemptNumber: 7,
                timeMs: 0,
                raw: { fallback: true }
            }
        };
    }

    /**
     * Registra un log
     */
    private log(attemptNumber: number, status: 'searching' | 'found' | 'failed' | 'validating', message: string): void {
        const log: DiscoveryLog = {
            timestamp: new Date().toISOString(),
            attempt: attemptNumber,
            source: 'pipeline' as any,
            status,
            message
        };

        this.logs.push(log);

        // Log visual en consola
        logDiscovery('PIPELINE', status === 'found' ? '✓' : '🔄', message);

        // Callback si está registrado
        if (this.logCallback) {
            this.logCallback(log);
        }
    }

    /**
     * Detiene el pipeline
     */
    public stop(): void {
        this.isRunning = false;
        this.log(0, 'failed', 'Pipeline detenido manualmente');
    }

    /**
     * Obtiene logs
     */
    public getLogs(): DiscoveryLog[] {
        return this.logs;
    }

    /**
     * Limpia logs
     */
    public clearLogs(): void {
        this.logs = [];
    }
}

// Exportar instancia singleton
export const emailDiscoveryPipeline = new EmailDiscoveryPipeline();
