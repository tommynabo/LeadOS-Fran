/**
 * AutopilotService - Piloto Automático para LeadOS
 * 
 * Lógica de programación automática de búsquedas de leads.
 * - Almacena configuración en localStorage (persistente por navegador)
 * - Comprueba cada 30 segundos si es hora de ejecutar
 * - Ejecuta la búsqueda automáticamente a la hora programada
 * - Evita ejecuciones duplicadas en el mismo día
 * - Solo funciona mientras la pestaña del navegador esté abierta
 */

export interface AutopilotConfig {
  enabled: boolean;
  scheduledTime: string;       // "HH:MM" format
  leadsQuantity: number;       // Number of leads to search
  lastRunDate: string | null;  // "YYYY-MM-DD" to track daily execution
}

export type AutopilotTriggerCallback = (quantity: number) => void;
export type AutopilotLogCallback = (message: string) => void;

class AutopilotService {
  private config: AutopilotConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onTrigger: AutopilotTriggerCallback | null = null;
  private onLog: AutopilotLogCallback | null = null;
  private storageKey: string;
  private isRunning: boolean = false;

  constructor(projectId: string) {
    this.storageKey = `autopilot_config_${projectId}`;
    this.config = this.loadConfig();
  }

  // --- Persistence ---

  private loadConfig(): AutopilotConfig {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          enabled: parsed.enabled ?? false,
          scheduledTime: parsed.scheduledTime ?? '09:00',
          leadsQuantity: parsed.leadsQuantity ?? 10,
          lastRunDate: parsed.lastRunDate ?? null,
        };
      }
    } catch (e) {
      console.error('[AUTOPILOT] Error loading config from localStorage:', e);
    }
    return {
      enabled: false,
      scheduledTime: '09:00',
      leadsQuantity: 10,
      lastRunDate: null,
    };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (e) {
      console.error('[AUTOPILOT] Error saving config to localStorage:', e);
    }
  }

  // --- Public API ---

  /** Get current config (copy) */
  getConfig(): AutopilotConfig {
    return { ...this.config };
  }

  /** Set callbacks for when autopilot triggers a search */
  setCallbacks(onTrigger: AutopilotTriggerCallback, onLog: AutopilotLogCallback): void {
    this.onTrigger = onTrigger;
    this.onLog = onLog;
  }

  /** Enable autopilot with specific time and quantity */
  enable(time: string, quantity: number): void {
    this.config.enabled = true;
    this.config.scheduledTime = time;
    this.config.leadsQuantity = quantity;
    this.saveConfig();
    this.startMonitoring();
    this.onLog?.(`[AUTOPILOT] ✅ Piloto automático ACTIVADO — Programado a las ${time} con ${quantity} leads`);
  }

  /** Disable autopilot */
  disable(): void {
    this.config.enabled = false;
    this.saveConfig();
    this.stopMonitoring();
    this.onLog?.('[AUTOPILOT] ⏹️ Piloto automático DESACTIVADO');
  }

  /** Update scheduled time */
  updateTime(time: string): void {
    this.config.scheduledTime = time;
    this.saveConfig();
    console.log(`[AUTOPILOT] Hora actualizada a ${time}`);
  }

  /** Update leads quantity */
  updateQuantity(quantity: number): void {
    this.config.leadsQuantity = Math.max(1, Math.min(50, quantity));
    this.saveConfig();
    console.log(`[AUTOPILOT] Cantidad actualizada a ${this.config.leadsQuantity}`);
  }

  /** Initialize on app mount — resumes monitoring if was enabled */
  initialize(): void {
    if (this.config.enabled) {
      this.startMonitoring();
      console.log(`[AUTOPILOT] Inicializado — Monitoreo activo para las ${this.config.scheduledTime}`);
    }
  }

  /** Clean up on unmount */
  destroy(): void {
    this.stopMonitoring();
  }

  /** Notify that a search just completed (to prevent re-triggering) */
  markSearchComplete(): void {
    this.isRunning = false;
  }

  /** Check if autopilot already ran today */
  hasRunToday(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.config.lastRunDate === today;
  }

  /** Manually reset today's run (allows re-run) */
  resetTodayRun(): void {
    this.config.lastRunDate = null;
    this.saveConfig();
  }

  // --- Internal Logic ---

  private startMonitoring(): void {
    this.stopMonitoring();
    this.intervalId = setInterval(() => this.checkSchedule(), 30_000);
    this.checkSchedule();
  }

  private stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private checkSchedule(): void {
    if (!this.config.enabled || this.isRunning) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (this.config.lastRunDate === today) return;

    const [targetH, targetM] = this.config.scheduledTime.split(':').map(Number);
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const targetMinutes = targetH * 60 + targetM;
    const currentMinutes = currentH * 60 + currentM;
    const diff = currentMinutes - targetMinutes;

    if (diff >= 0 && diff <= 5) {
      this.triggerSearch(today);
    }
  }

  private triggerSearch(today: string): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.config.lastRunDate = today;
    this.saveConfig();

    const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    this.onLog?.('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.onLog?.(`[AUTOPILOT] 🤖 PILOTO AUTOMÁTICO ACTIVADO`);
    this.onLog?.(`[AUTOPILOT] ⏰ Hora programada: ${this.config.scheduledTime} | Hora actual: ${timeStr}`);
    this.onLog?.(`[AUTOPILOT] 📊 Buscando ${this.config.leadsQuantity} leads automáticamente...`);
    this.onLog?.('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    this.onTrigger?.(this.config.leadsQuantity);
  }
}

export const autopilotService = new AutopilotService('leados_fran');

export default AutopilotService;
