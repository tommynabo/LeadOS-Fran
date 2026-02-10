/**
 * Email Discovery Pipeline - Tipos de datos
 * Define todas las interfaces y tipos usados en el pipeline
 */

export interface CompanyData {
    name: string;
    website: string;
    industry: string;
    location: string;
    description?: string;
}

export interface OwnerData {
    name: string;
    role: string;
    email: string;
    linkedinProfile?: string;
    twitterHandle?: string;
    verified?: boolean;
}

export interface EmailDiscoveryResult {
    email: string;
    ownerName: string;
    ownerRole: string;
    source: EmailDiscoverySource;
    confidence: number; // 0-1 (0.5 = 50%, 0.95 = 95%)
    linkedinProfile?: string;
    twitterHandle?: string;
    recentPosts?: string[];
    metadata?: {
        attemptNumber: number;
        timeMs: number;
        raw?: any;
    };
}

export type EmailDiscoverySource = 
    | 'apify_linkedin'      // Intento 1
    | 'google_dorks'        // Intento 2
    | 'website_scrape'      // Intento 3
    | 'email_pattern'       // Intento 4
    | 'whois'               // Intento 5
    | 'twitter'             // Intento 6
    | 'smtp_validation'     // Intento 7
    | 'fallback';           // Email genérico

export interface DiscoveryLog {
    timestamp: string;
    attempt: number;
    source: EmailDiscoverySource;
    status: 'searching' | 'found' | 'failed' | 'validating';
    message: string;
    result?: EmailDiscoveryResult;
}

export interface EmailPattern {
    pattern: string;
    probability: number; // Basado en índice: primeros patrones tienen mayor probabilidad
}

export interface SMTPValidationResult {
    email: string;
    isValid: boolean;
    exists: boolean;
    confidence: number;
}

export interface WhoisData {
    registrantName?: string;
    registrantEmail?: string;
    adminName?: string;
    adminEmail?: string;
    ownerName?: string;
    ownerEmail?: string;
}

export interface GoogleDoorkResult {
    title: string;
    url: string;
    snippet: string;
    email?: string;
}

export interface ApifyLinkedInResult {
    name: string;
    title: string;
    url: string;
    company: string;
    description?: string;
    posts?: string[];
}
