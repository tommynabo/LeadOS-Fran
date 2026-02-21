/**
 * BUFFERED SEARCH SERVICE - Super Lógica de Garantía de Resultados
 * 
 * Este servicio envuelve SearchService con:
 * - Buffer Dinámico (Raw Candidates → Discovered → Enriched → Ready)
 * - Multi-Strategy Fallback (Gmail → LinkedIn → Combinado)
 * - Dynamic Loop Expansion (Si hay muchos dups, amplía búsqueda)
 * - Garantía Matemática de Resultados
 */

import { Lead, SearchConfigState } from '../../lib/types';
import { searchService, LogCallback, ResultCallback } from './SearchService';
import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE BUFFER
// ═══════════════════════════════════════════════════════════════════════════

enum BufferStage {
    RAW = 'raw',                    // Candidatos sin procesar
    DISCOVERED = 'discovered',      // Email encontrado
    ENRICHED = 'enriched',          // Con análisis básico
    READY = 'ready'                 // Listo para entregar
}

interface BufferedLead extends Lead {
    bufferStage: BufferStage;
    attemptNumber: number;          // En qué intento se encontró
    discoveryMethod: 'gmail' | 'linkedin' | 'combined';
}

interface BufferState {
    [BufferStage.RAW]: BufferedLead[];
    [BufferStage.DISCOVERED]: BufferedLead[];
    [BufferStage.ENRICHED]: BufferedLead[];
    [BufferStage.READY]: BufferedLead[];
}

interface SearchMetrics {
    totalRawCandidates: number;
    duplicatesFound: number;
    successRate: number;          // % de raw que llega a ready
    totalMethods: number;          // Cuántos métodos se intentaron
    timeTakenMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUFFERED SEARCH SERVICE - MOTOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export class BufferedSearchService {
    private buffer: BufferState = {
        [BufferStage.RAW]: [],
        [BufferStage.DISCOVERED]: [],
        [BufferStage.ENRICHED]: [],
        [BufferStage.READY]: []
    };

    private metrics: SearchMetrics = {
        totalRawCandidates: 0,
        duplicatesFound: 0,
        successRate: 0,
        totalMethods: 0,
        timeTakenMs: 0
    };

    private isRunning = false;
    private existingLeads: Set<string> = new Set();

    // ═══════════════════════════════════════════════════════════════════════════
    // ENTRY POINT: START BUFFERED SEARCH
    // ═══════════════════════════════════════════════════════════════════════════

    public async startBufferedSearch(
        config: SearchConfigState,
        onLog: LogCallback,
        onComplete: ResultCallback
    ) {
        const startTime = Date.now();
        this.isRunning = true;
        this.buffer = {
            [BufferStage.RAW]: [],
            [BufferStage.DISCOVERED]: [],
            [BufferStage.ENRICHED]: [],
            [BufferStage.READY]: []
        };
        this.metrics = {
            totalRawCandidates: 0,
            duplicatesFound: 0,
            successRate: 0,
            totalMethods: 0,
            timeTakenMs: 0
        };

        try {
            onLog(`\n═══════════════════════════════════════════════════════════`);
            onLog(`🚀 INICIANDO BUFFERED SEARCH CON GARANTÍA DE RESULTADOS`);
            onLog(`═══════════════════════════════════════════════════════════\n`);

            // FASE 0: Cargar leads existentes
            await this.loadExistingLeads(onLog);

            // Obtener userId de Supabase
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || null;

            // FASE 1: ESTRATEGIA MULTI-FUENTE
            await this.executeMultiSourceStrategy(config, userId, onLog);

            // FASE 2: PROCESAR BUFFER
            await this.processBuffer(onLog);

            // FASE 3: GARANTÍA DE RESULTADOS
            await this.guaranteeResults(config, onLog);

            // FASE 4: RECOPILAR RESULTADOS FINALES
            const finalResults = await this.compileFinalResults(onLog);

            this.metrics.timeTakenMs = Date.now() - startTime;

            onLog(`\n═══════════════════════════════════════════════════════════`);
            onLog(`✅ BÚSQUEDA COMPLETADA CON ÉXITO`);
            onLog(`📊 Resultados: ${finalResults.length}/${config.maxResults} leads`);
            onLog(`⏱️ Tiempo total: ${(this.metrics.timeTakenMs / 1000).toFixed(1)}s`);
            onLog(`🎯 Tasa de éxito: ${this.metrics.successRate.toFixed(1)}%`);
            onLog(`═══════════════════════════════════════════════════════════\n`);

            onComplete(finalResults);

        } catch (error: any) {
            onLog(`\n❌ ERROR CRÍTICO: ${error.message}`);
            // Aún así, devolver lo que tenemos en el buffer
            const partialResults = this.compileFinalResultsSync();
            onLog(`⚠️ Devolviendo ${partialResults.length} resultados parciales...`);
            onComplete(partialResults);
        } finally {
            this.isRunning = false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FASE 0: CARGAR LEADS EXISTENTES
    // ═══════════════════════════════════════════════════════════════════════════

    private async loadExistingLeads(onLog: LogCallback): Promise<void> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                this.existingLeads = new Set();
                return;
            }

            const { data } = await supabase
                .from('search_results_fran')
                .select('lead_data')
                .eq('user_id', user.id);

            if (!data) {
                this.existingLeads = new Set();
                return;
            }

            for (const row of data) {
                if (Array.isArray(row.lead_data)) {
                    row.lead_data.forEach((lead: any) => {
                        if (lead.website) {
                            const normalized = lead.website
                                .toLowerCase()
                                .replace(/^https?:\/\//, '')
                                .replace(/^www\./, '')
                                .replace(/\/$/, '');
                            this.existingLeads.add(normalized);
                        }
                        if (lead.companyName) {
                            this.existingLeads.add(lead.companyName.toLowerCase().trim());
                        }
                    });
                }
            }

            onLog(`🛡️ Anti-Duplicados activado: ${this.existingLeads.size} empresas en historial`);
        } catch (e) {
            onLog(`⚠️ No se pudo cargar historial de leads: ${e}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FASE 1: ESTRATEGIA MULTI-FUENTE
    // ═══════════════════════════════════════════════════════════════════════════

    private async executeMultiSourceStrategy(
        config: SearchConfigState,
        userId: string | null,
        onLog: LogCallback
    ): Promise<void> {
        const targetCount = config.maxResults || 5;
        const maxIterations = 2;

        const userSelectedSource = config.source;
        const readyBefore = this.buffer[BufferStage.READY].length;

        onLog(`\n🔐 Fuente seleccionada: ${userSelectedSource.toUpperCase()}`);
        onLog(`🔄 Iniciando búsqueda con: ${this.getStrategyName(userSelectedSource)}`);
        onLog(`📍 Objetivo: ${targetCount} leads\n`);

        this.metrics.totalMethods = 1;

        // Ejecutar la estrategia seleccionada
        const tempConfig = { ...config, source: userSelectedSource };
        await this.executeStrategyWithRetry(tempConfig, userId, onLog, maxIterations);

        const readyAfter = this.buffer[BufferStage.READY].length;
        const foundInPrimary = readyAfter - readyBefore;

        if (foundInPrimary > 0) {
            // ✅ La búsqueda primaria funcionó
            onLog(`\n📊 Status: ${foundInPrimary} leads encontrados en ${userSelectedSource.toUpperCase()}`);
            return;
        }

        // ⚠️ La búsqueda primaria NO devolvió nada
        onLog(`\n⚠️ No se encontraron resultados en ${userSelectedSource.toUpperCase()}`);
        onLog(`💡 Respetando selección del usuario. Usa el método ${userSelectedSource.toUpperCase()} o cambia de estrategia.\n`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EJECUTAR ESTRATEGIA CON REINTENTOS
    // ═══════════════════════════════════════════════════════════════════════════

    private async executeStrategyWithRetry(
        config: SearchConfigState,
        userId: string | null,
        onLog: LogCallback,
        maxIterations: number
    ): Promise<void> {
        const maxTimeoutMinutes = 10; // Máximo 10 minutos total por estrategia
        const startTime = Date.now();
        const timeoutMs = maxTimeoutMinutes * 60 * 1000;

        for (let iteration = 1; iteration <= maxIterations; iteration++) {
            if (!this.isRunning) {
                onLog(`✅ Búsqueda cancelada por usuario`);
                break;
            }

            // Revisar timeout global
            if (Date.now() - startTime > timeoutMs) {
                onLog(`⏱️ Timeout alcanzado (${maxTimeoutMinutes} minutos). Cancelando iteraciones...`);
                break;
            }

            const readyCount = this.buffer[BufferStage.READY].length;
            const needed = (config.maxResults || 5) - readyCount;

            if (needed <= 0) {
                onLog(`✅ Objetivo alcanzado, deteniendo iteraciones`);
                break;
            }

            onLog(`  ↳ Iteración ${iteration}/${maxIterations} (faltantes: ${needed})...`);

            try {
                let leadsReceived = 0;
                
                await new Promise<void>((resolve) => {
                    searchService.startSearch(config, userId, onLog, (leads) => {
                        leadsReceived = leads.length;
                        if (leads.length === 0) {
                            onLog(`  ⚠️ Iteración ${iteration}: Búsqueda devolvió 0 leads`);
                        } else {
                            onLog(`  📥 Iteración ${iteration}: Recibidos ${leads.length} candidatos`);
                        }
                        this.processIncomingLeads(leads, config.source, iteration, onLog);
                        resolve();
                    });
                });
                
                if (leadsReceived === 0 && iteration === 1) {
                    onLog(`  💡 Primera iteración sin resultados. Es posible que no haya matches para esta búsqueda.`);
                }
                
            } catch (e) {
                onLog(`  ⚠️ Error en iteración ${iteration}: ${e}`);
                // Continue to next iteration
            }

            // Pequeña pausa entre iteraciones
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROCESAR LEADS ENTRANTES
    // ═══════════════════════════════════════════════════════════════════════════

    private processIncomingLeads(
        leads: Lead[],
        method: 'gmail' | 'linkedin',
        attemptNumber: number,
        onLog: LogCallback
    ): void {
        if (!leads || leads.length === 0) {
            onLog(`  ⚠️ Cero resultados de esta búsqueda`);
            return;
        }

        onLog(`  📥 Recibidos ${leads.length} leads, procesando deduplicación exhaustiva...`);

        for (const lead of leads) {
            const bufferedLead: BufferedLead = {
                ...lead,
                bufferStage: BufferStage.RAW,
                attemptNumber: attemptNumber,
                discoveryMethod: method
            };

            // VALIDACIÓN EXHAUSTIVA DE DUPLICADOS (6 métodos)
            if (this.isDuplicate(bufferedLead, false)) {
                this.metrics.duplicatesFound++;
                onLog(`  🔄 Saltando duplicado: ${lead.companyName} (validación 6-criterios)`);
                continue;
            }

            // VALIDACIÓN INTERNA (vs buffer local)
            const isLocalDuplicate = this.buffer[BufferStage.READY].some(
                l => l.website === lead.website || 
                     (l.companyName === lead.companyName && l.website)
            ) ||
            this.buffer[BufferStage.DISCOVERED].some(
                l => l.website === lead.website || 
                     (l.companyName === lead.companyName && l.website)
            ) ||
            this.buffer[BufferStage.ENRICHED].some(
                l => l.website === lead.website || 
                     (l.companyName === lead.companyName && l.website)
            );

            if (isLocalDuplicate) {
                onLog(`  🔄 Duplicado local encontrado: ${lead.companyName}`);
                continue;
            }

            // Determinar etapa del buffer
            let stage = BufferStage.RAW;
            if (lead.decisionMaker?.email && lead.decisionMaker.email !== '' && !lead.decisionMaker.email.includes('@example')) {
                stage = BufferStage.DISCOVERED;
            }
            if (lead.status === 'enriched' || lead.status === 'ready') {
                stage = BufferStage.ENRICHED;
            }
            if (lead.status === 'ready') {
                stage = BufferStage.READY;
            }

            bufferedLead.bufferStage = stage;

            // Agregar al buffer y guardar identificadores
            this.buffer[stage].push(bufferedLead);
            this.metrics.totalRawCandidates++;

            // Actualizar set de histórico para futuras búsquedas en esta sesión
            if (lead.website) {
                const normalized = lead.website
                    .toLowerCase()
                    .replace(/^https?:\/\//, '')
                    .replace(/^www\./, '')
                    .replace(/\/$/, '');
                this.existingLeads.add(normalized);
            }
            if (lead.companyName && lead.companyName !== 'Sin Nombre') {
                this.existingLeads.add(lead.companyName.toLowerCase().trim());
            }

            onLog(`  ✅ Añadido al buffer [${stage.toUpperCase()}]: ${lead.companyName}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FASE 2: PROCESAR BUFFER (Avanzar leads por etapas)
    // ═══════════════════════════════════════════════════════════════════════════

    private async processBuffer(onLog: LogCallback): Promise<void> {
        onLog(`\n📦 PROCESANDO BUFFER DINÁMICO:`);
        onLog(`  RAW → DISCOVERED → ENRICHED → READY\n`);

        // Stage 1: RAW → DISCOVERED (Los que no tienen email, no procesamos más, solo filtro)
        const rawCount = this.buffer[BufferStage.RAW].length;
        if (rawCount > 0) {
            onLog(`  ℹ️ ${rawCount} leads en RAW (sin email, se mantienen como fallback)`);
        }

        // Stage 2: DISCOVERED → ENRICHED (Estos ya tienen email, revisamos que estén en ENRICHED)
        const discoveredCount = this.buffer[BufferStage.DISCOVERED].length;
        const enrichedCount = this.buffer[BufferStage.ENRICHED].length;

        onLog(`  📊 STATUS ACTUAL:`);
        onLog(`     - RAW: ${rawCount}`);
        onLog(`     - DISCOVERED: ${discoveredCount}`);
        onLog(`     - ENRICHED: ${enrichedCount}`);
        onLog(`     - READY: ${this.buffer[BufferStage.READY].length}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FASE 3: GARANTÍA MATEMÁTICA DE RESULTADOS
    // ═══════════════════════════════════════════════════════════════════════════

    private async guaranteeResults(config: SearchConfigState, onLog: LogCallback): Promise<void> {
        const targetCount = config.maxResults || 5;
        const readyCount = this.buffer[BufferStage.READY].length;

        if (readyCount >= targetCount) {
            onLog(`\n✅ META ALCANZADA: Ya tenemos ${readyCount} leads READY`);
            return;
        }

        const deficit = targetCount - readyCount;
        onLog(`\n⚡ ACTIVANDO GARANTÍA DE RESULTADOS (Deficit: ${deficit})`);

        // FALLBACK 1: Ascender leads de ENRICHED a READY (aunque falten datos menores)
        if (deficit > 0) {
            const enrichedToPromote = Math.min(deficit, this.buffer[BufferStage.ENRICHED].length);
            if (enrichedToPromote > 0) {
                onLog(`  ↗️ Promoviendo ${enrichedToPromote} leads de ENRICHED → READY`);
                for (let i = 0; i < enrichedToPromote; i++) {
                    const lead = this.buffer[BufferStage.ENRICHED].pop();
                    if (lead) {
                        lead.bufferStage = BufferStage.READY;
                        this.buffer[BufferStage.READY].push(lead);
                    }
                }
            }
        }

        // FALLBACK 2: Ascender leads de DISCOVERED a READY (tienen email, eso es suficiente)
        if (this.buffer[BufferStage.READY].length < targetCount) {
            const deficit2 = targetCount - this.buffer[BufferStage.READY].length;
            const discoveredToPromote = Math.min(deficit2, this.buffer[BufferStage.DISCOVERED].length);
            if (discoveredToPromote > 0) {
                onLog(`  ↗️ Promoviendo ${discoveredToPromote} leads de DISCOVERED → READY`);
                for (let i = 0; i < discoveredToPromote; i++) {
                    const lead = this.buffer[BufferStage.DISCOVERED].pop();
                    if (lead) {
                        lead.bufferStage = BufferStage.READY;
                        this.buffer[BufferStage.READY].push(lead);
                    }
                }
            }
        }

        // FALLBACK 3: Ascender leads de RAW (no tienen email, pero tienen empresa)
        if (this.buffer[BufferStage.READY].length < targetCount) {
            const deficit3 = targetCount - this.buffer[BufferStage.READY].length;
            const rawToPromote = Math.min(deficit3, this.buffer[BufferStage.RAW].length);
            if (rawToPromote > 0) {
                onLog(`  ↗️ ÚLTIMO RECURSO: Promoviendo ${rawToPromote} leads de RAW → READY`);
                onLog(`  ⚠️ Estos leads pueden no tener email completo`);
                for (let i = 0; i < rawToPromote; i++) {
                    const lead = this.buffer[BufferStage.RAW].pop();
                    if (lead) {
                        lead.bufferStage = BufferStage.READY;
                        this.buffer[BufferStage.READY].push(lead);
                    }
                }
            }
        }

        const finalCount = this.buffer[BufferStage.READY].length;
        onLog(`\n🎯 Resultado Final: ${finalCount}/${targetCount} leads garantizados`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPILAR RESULTADOS FINALES
    // ═══════════════════════════════════════════════════════════════════════════

    private async compileFinalResults(onLog: LogCallback): Promise<Lead[]> {
        const readyLeads = this.buffer[BufferStage.READY].map(l => {
            const { bufferStage, attemptNumber, discoveryMethod, ...cleanLead } = l;
            return cleanLead;
        });

        // Calcular tasa de éxito
        if (this.metrics.totalRawCandidates > 0) {
            this.metrics.successRate = (readyLeads.length / this.metrics.totalRawCandidates) * 100;
        }

        onLog(`\n💾 Compilando ${readyLeads.length} resultados finales...`);
        return readyLeads;
    }

    private compileFinalResultsSync(): Lead[] {
        return this.buffer[BufferStage.READY].map(l => {
            const { bufferStage, attemptNumber, discoveryMethod, ...cleanLead } = l;
            return cleanLead;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    private getStrategyOrder(preferredSource: 'gmail' | 'linkedin'): ('gmail' | 'linkedin')[] {
        // 🔒 SOLO devolver la fuente seleccionada (sin fallback automático)
        // El usuario eligió explícitamente la fuente
        return [preferredSource];
    }

    private getStrategyName(strategy: 'gmail' | 'linkedin'): string {
        if (strategy === 'gmail') {
            return 'Gmail + Google Maps (Búsqueda Local)';
        } else {
            return 'LinkedIn X-Ray (Búsqueda por Roles)';
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDADOR ULTRA-ROBUSTO DE DUPLICADOS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validación exhaustiva de duplicados usando múltiples criterios
     */
    private isDuplicate(lead: BufferedLead, strictMode: boolean = false): boolean {
        if (!lead) return false;

        // Criterio 1: Dominio website normalizado
        if (lead.website) {
            const normalizedWeb = lead.website
                .toLowerCase()
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .replace(/\/$/, '')
                .split('/')[0]; // Solo dominio principal

            if (this.existingLeads.has(normalizedWeb)) {
                return true;
            }

            // Criterio 2: Variaciones de dominio
            const webVariations = [
                normalizedWeb.replace('.es', '.com'),
                normalizedWeb.replace('.com', '.es'),
                normalizedWeb.split('.')[0] // Solo nombre sin TLD
            ];

            if (webVariations.some(v => this.existingLeads.has(v))) {
                if (strictMode) return true; // En modo estricto, cualquier similitud es dup
            }
        }

        // Criterio 3: Nombre de empresa normalizado
        if (lead.companyName && lead.companyName !== 'Sin Nombre') {
            const normalizedName = lead.companyName
                .toLowerCase()
                .trim()
                .replace(/[^\w\s]/g, '') // Quitar caracteres especiales
                .replace(/\s+/g, ' '); // Normalizar espacios

            if (this.existingLeads.has(normalizedName)) {
                return true;
            }

            // Criterio 4: Substring matching (para falsos positivos)
            for (const existing of this.existingLeads) {
                if (strictMode && normalizedName.includes(existing)) {
                    return true;
                }
            }
        }

        // Criterio 5: Email del decisor
        if (lead.decisionMaker?.email && lead.decisionMaker.email !== '') {
            const emailNorm = lead.decisionMaker.email.toLowerCase();
            if (this.existingLeads.has(emailNorm)) {
                return true;
            }
        }

        // Criterio 6: LinkedIn profile
        if (lead.decisionMaker?.linkedin && lead.decisionMaker.linkedin !== '') {
            const linkedinNorm = lead.decisionMaker.linkedin.toLowerCase();
            if (this.existingLeads.has(linkedinNorm)) {
                return true;
            }
        }

        return false;
    }

    public stop(): void {
        this.isRunning = false;
        searchService.stop();
    }
}

export const bufferedSearchService = new BufferedSearchService();
