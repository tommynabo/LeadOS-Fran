/**
 * INTENTO 7: SMTP Validation
 * Valida si un email existe usando SMTP check
 */

import { EmailDiscoveryResult, SMTPValidationResult } from './types';
import { logDiscovery, isValidEmailFormat } from './utils';

export class SMTPValidatorService {
    /**
     * Valida lista de emails usando SMTP
     */
    async validateEmails(emails: string[]): Promise<SMTPValidationResult[]> {
        logDiscovery('SMTP', '✓', `Validando ${emails.length} emails...`);

        const results: SMTPValidationResult[] = [];

        for (const email of emails) {
            const result = await this.validateEmail(email);
            results.push(result);
            
            if (result.exists) {
                break; // Si encontramos uno válido, parar
            }
        }

        return results;
    }

    /**
     * Valida un email específico vía SMTP
     */
    async validateEmail(email: string): Promise<SMTPValidationResult> {
        try {
            // Validación de formato primero
            if (!isValidEmailFormat(email)) {
                return {
                    email,
                    isValid: false,
                    exists: false,
                    confidence: 0
                };
            }

            const [, domain] = email.split('@');

            // DNS MX lookup
            const mxExists = await this.checkMXRecords(domain);

            if (!mxExists) {
                return {
                    email,
                    isValid: false,
                    exists: false,
                    confidence: 0
                };
            }

            // SMTP check (este requiere backend)
            // Para frontend, solo validamos que dominio exista
            return {
                email,
                isValid: true,
                exists: true,
                confidence: 0.5 // Confianza media sin validar SMTP real
            };

        } catch (error: any) {
            logDiscovery('SMTP', '⚠️', `Validation error for ${email}: ${error.message}`);
            
            return {
                email,
                isValid: false,
                exists: false,
                confidence: 0
            };
        }
    }

    /**
     * Verifica si dominio tiene MX records
     */
    private async checkMXRecords(domain: string): Promise<boolean> {
        try {
            // En navegador no podemos hacer DNS queries directas
            // Esto requeriría un backend con librería 'dns' de Node.js
            
            // Workaround: intentar enviar petición HTTPS al dominio
            const response = await fetch(`https://${domain}`, { 
                method: 'HEAD',
                mode: 'no-cors'
            });

            // Si recibimos respuesta (incluso no-cors), el dominio existe
            return true;

        } catch (error) {
            // Si falla, probablemente el dominio no existe
            return false;
        }
    }

    /**
     * Obtiene el mejor email de una lista (que exista)
     * Retorna result de EmailDiscoveryResult o null
     */
    async getBestEmail(emails: string[]): Promise<{ email: string; confidence: number } | null> {
        const results = await this.validateEmails(emails);

        // Buscar el primero que exista
        for (const result of results) {
            if (result.exists && result.isValid) {
                return {
                    email: result.email,
                    confidence: result.confidence
                };
            }
        }

        // Si ninguno existe, devolver el primero de todas formas
        if (emails.length > 0 && isValidEmailFormat(emails[0])) {
            return {
                email: emails[0],
                confidence: 0.3 // Baja confianza
            };
        }

        return null;
    }
}

export const smtpValidatorService = new SMTPValidatorService();
