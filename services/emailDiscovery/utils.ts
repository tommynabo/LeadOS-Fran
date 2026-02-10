/**
 * Email Discovery Pipeline - Utilidades
 * Funciones auxiliares reutilizables
 */

/**
 * Extrae emails de un texto usando regex
 */
export function extractEmailsFromText(text: string): string[] {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    return text.match(emailRegex) || [];
}

/**
 * Valida formato básico de email
 */
export function isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Extrae dominio de email
 */
export function getDomainFromEmail(email: string): string {
    const parts = email.split('@');
    return parts[1] || '';
}

/**
 * Extrae dominio de URL
 */
export function extractDomain(url: string): string {
    try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`);
        return u.hostname.replace('www.', '');
    } catch {
        return url.replace('www.', '').split('/')[0];
    }
}

/**
 * Limpia nombre para búsquedas
 */
export function cleanName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 0)
        .join(' ');
}

/**
 * Genera variaciones de nombre (firstname, lastname, etc)
 */
export function getNameParts(fullName: string): {
    firstName: string;
    lastName: string;
    full: string;
    initials: string;
} {
    const parts = fullName.trim().split(/\s+/);
    
    return {
        firstName: parts[0] || '',
        lastName: parts[parts.length - 1] || '',
        full: fullName,
        initials: parts.map(p => p[0]).join('').toLowerCase(),
    };
}

/**
 * Deduplicar emails
 */
export function deduplicateEmails(emails: string[]): string[] {
    return Array.from(new Set(emails.map(e => e.toLowerCase())));
}

/**
 * Filtrar emails spam/genricos
 */
export function filterSpamEmails(emails: string[]): string[] {
    const spamPatterns = [
        'noreply',
        'sentry',
        'wix',
        'mailchimp',
        'notification',
        'donotreply',
        'automated',
        'bot',
        'system'
    ];

    return emails.filter(email => {
        const lower = email.toLowerCase();
        return !spamPatterns.some(pattern => lower.includes(pattern));
    });
}

/**
 * Espera (para delays entre requests)
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parsea JSON de forma segura
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
    try {
        const json = JSON.parse(text);
        return json as T;
    } catch {
        return fallback;
    }
}

/**
 * Extrae JSON de un texto (para cuando GPT devuelve markdown)
 */
export function extractJsonFromText(text: string): any {
    try {
        // Intenta directo
        return JSON.parse(text);
    } catch {
        // Intenta encontrar JSON entre {}
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch {
                return null;
            }
        }
        return null;
    }
}

/**
 * Log formateado con timestamp
 */
export function logDiscovery(source: string, status: string, message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${source}] ${status}: ${message}`);
}
