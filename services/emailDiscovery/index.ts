/**
 * Email Discovery Pipeline - Index
 * Punto de entrada principal
 */

export type {
    // Tipos
    CompanyData,
    OwnerData,
    EmailDiscoveryResult,
    EmailDiscoverySource,
    DiscoveryLog,
    EmailPattern,
    SMTPValidationResult,
    WhoisData,
    GoogleDoorkResult,
    ApifyLinkedInResult
} from './types';

export {
    // Configuración
    EMAIL_DISCOVERY_CONFIG,
    validateConfig
} from './config';

export {
    // Utilidades
    extractEmailsFromText,
    isValidEmailFormat,
    getDomainFromEmail,
    extractDomain,
    cleanName,
    getNameParts,
    deduplicateEmails,
    filterSpamEmails,
    delay,
    safeJsonParse,
    extractJsonFromText,
    logDiscovery
} from './utils';

export {
    // Servicios
    ApifyLinkedInService,
    apifyLinkedInService
} from './ApifyLinkedInService';

export {
    GoogleDorksService,
    googleDorksService
} from './GoogleDorksService';

export {
    WebsiteScraperService,
    websiteScraperService
} from './WebsiteScraperService';

export {
    EmailPatternGeneratorService,
    emailPatternGeneratorService
} from './EmailPatternGeneratorService';

export {
    WhoisService,
    whoisService
} from './WhoisService';

export {
    TwitterService,
    twitterService
} from './TwitterService';

export {
    SMTPValidatorService,
    smtpValidatorService
} from './SmtpValidatorService';

export {
    // Pipeline Principal
    EmailDiscoveryPipeline,
    emailDiscoveryPipeline
} from './EmailDiscoveryPipeline';

export type {
    DiscoveryLogCallback
} from './EmailDiscoveryPipeline';
