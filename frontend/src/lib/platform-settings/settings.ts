export type PlatformLanguage = 'ar' | 'en';
export type PlatformProvider = 'ollama' | 'openai-compatible' | 'azure-openai';
export type PlatformTimezone = 'Asia/Aden' | 'Asia/Riyadh' | 'UTC' | 'Europe/London';

export interface PlatformSettings {
  general: { defaultLanguage: PlatformLanguage; timezone: PlatformTimezone };
  query: { sqlTimeoutSeconds: number; maxCorrectionAttempts: number; maxRetryAttempts: number };
  audit: { retentionDays: number; redactSensitiveFields: boolean; immutable: boolean };
  ai: { defaultProvider: PlatformProvider; defaultModel: string; requestsPerMinute: number; maxConcurrentRequests: number };
}

export interface SettingsIssue { field: string; message: string }
export interface SettingsChange { field: string; label: string; before: string; after: string }
export interface SettingsHistoryEntry {
  id: string;
  timestamp: string;
  summary: string;
  changes: SettingsChange[];
  previousSettings: PlatformSettings;
}

export const PLATFORM_SETTINGS_STORAGE_KEY = 'bayan.platform.settings.demo.v1';
export const PLATFORM_SETTINGS_NOTICE = 'هذه إعدادات تجريبية محفوظة في هذا المتصفح فقط؛ لا تغيّر إعدادات الخادم أو سياسات المنصة الفعلية.';
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  general: { defaultLanguage: 'ar', timezone: 'Asia/Aden' },
  query: { sqlTimeoutSeconds: 30, maxCorrectionAttempts: 2, maxRetryAttempts: 2 },
  audit: { retentionDays: 365, redactSensitiveFields: true, immutable: true },
  ai: { defaultProvider: 'ollama', defaultModel: 'qwen2.5:14b', requestsPerMinute: 60, maxConcurrentRequests: 8 },
};

export const PROVIDER_LABELS: Record<PlatformProvider, string> = {
  ollama: 'Ollama محلي',
  'openai-compatible': 'بوابة متوافقة مع OpenAI',
  'azure-openai': 'Azure OpenAI',
};
export const TIMEZONE_LABELS: Record<PlatformTimezone, string> = {
  'Asia/Aden': 'عدن (Asia/Aden)',
  'Asia/Riyadh': 'الرياض (Asia/Riyadh)',
  UTC: 'UTC',
  'Europe/London': 'لندن (Europe/London)',
};

const numberRules = [
  { path: 'query.sqlTimeoutSeconds', label: 'مهلة تنفيذ SQL', min: 5, max: 120, value: (s: PlatformSettings) => s.query.sqlTimeoutSeconds },
  { path: 'query.maxCorrectionAttempts', label: 'محاولات التصحيح', min: 0, max: 3, value: (s: PlatformSettings) => s.query.maxCorrectionAttempts },
  { path: 'query.maxRetryAttempts', label: 'محاولات إعادة التنفيذ', min: 0, max: 5, value: (s: PlatformSettings) => s.query.maxRetryAttempts },
  { path: 'audit.retentionDays', label: 'مدة الاحتفاظ بسجل التدقيق', min: 30, max: 3650, value: (s: PlatformSettings) => s.audit.retentionDays },
  { path: 'ai.requestsPerMinute', label: 'حد الطلبات في الدقيقة', min: 1, max: 600, value: (s: PlatformSettings) => s.ai.requestsPerMinute },
  { path: 'ai.maxConcurrentRequests', label: 'الطلبات المتزامنة', min: 1, max: 64, value: (s: PlatformSettings) => s.ai.maxConcurrentRequests },
] as const;

export function validatePlatformSettings(settings: PlatformSettings): SettingsIssue[] {
  const issues: SettingsIssue[] = [];
  for (const rule of numberRules) {
    const value = rule.value(settings);
    if (!Number.isInteger(value) || value < rule.min || value > rule.max) {
      issues.push({ field: rule.path, message: `${rule.label}: أدخل عددًا صحيحًا بين ${rule.min} و${rule.max}.` });
    }
  }
  if (!['ar', 'en'].includes(settings.general.defaultLanguage)) issues.push({ field: 'general.defaultLanguage', message: 'اللغة الافتراضية غير مدعومة.' });
  if (!Object.hasOwn(TIMEZONE_LABELS, settings.general.timezone)) issues.push({ field: 'general.timezone', message: 'المنطقة الزمنية غير مدعومة.' });
  if (!Object.hasOwn(PROVIDER_LABELS, settings.ai.defaultProvider)) issues.push({ field: 'ai.defaultProvider', message: 'مزود النماذج غير مدعوم.' });
  if (typeof settings.ai.defaultModel !== 'string' || !/^[\w.:/-]{2,80}$/.test(settings.ai.defaultModel)) {
    issues.push({ field: 'ai.defaultModel', message: 'اسم النموذج مطلوب، ويجب أن يتكون من 2 إلى 80 حرفًا آمنًا.' });
  }
  if (typeof settings.audit.redactSensitiveFields !== 'boolean') issues.push({ field: 'audit.redactSensitiveFields', message: 'قيمة إخفاء الحقول الحساسة غير صحيحة.' });
  if (settings.audit.immutable !== true) issues.push({ field: 'audit.immutable', message: 'يجب أن تظل سجلات التدقيق غير قابلة للتعديل من هذه الواجهة.' });
  return issues;
}

export function clonePlatformSettings(settings: PlatformSettings): PlatformSettings {
  return {
    general: { ...settings.general }, query: { ...settings.query },
    audit: { ...settings.audit }, ai: { ...settings.ai },
  };
}

export function settingsEqual(a: PlatformSettings, b: PlatformSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function displayValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'مفعّل' : 'معطّل';
  if (value === 'ar') return 'العربية';
  if (value === 'en') return 'English';
  if (Object.hasOwn(TIMEZONE_LABELS, value)) return TIMEZONE_LABELS[value as PlatformTimezone];
  if (Object.hasOwn(PROVIDER_LABELS, value)) return PROVIDER_LABELS[value as PlatformProvider];
  return String(value);
}

export function diffPlatformSettings(before: PlatformSettings, after: PlatformSettings): SettingsChange[] {
  const fields: Array<{ path: string; label: string; before: string | number | boolean; after: string | number | boolean }> = [
    { path: 'general.defaultLanguage', label: 'اللغة الافتراضية', before: before.general.defaultLanguage, after: after.general.defaultLanguage },
    { path: 'general.timezone', label: 'المنطقة الزمنية', before: before.general.timezone, after: after.general.timezone },
    { path: 'query.sqlTimeoutSeconds', label: 'مهلة تنفيذ SQL (ثانية)', before: before.query.sqlTimeoutSeconds, after: after.query.sqlTimeoutSeconds },
    { path: 'query.maxCorrectionAttempts', label: 'عدد محاولات التصحيح', before: before.query.maxCorrectionAttempts, after: after.query.maxCorrectionAttempts },
    { path: 'query.maxRetryAttempts', label: 'عدد محاولات إعادة التنفيذ', before: before.query.maxRetryAttempts, after: after.query.maxRetryAttempts },
    { path: 'audit.retentionDays', label: 'الاحتفاظ بسجل التدقيق (يوم)', before: before.audit.retentionDays, after: after.audit.retentionDays },
    { path: 'audit.redactSensitiveFields', label: 'إخفاء الحقول الحساسة', before: before.audit.redactSensitiveFields, after: after.audit.redactSensitiveFields },
    { path: 'ai.defaultProvider', label: 'مزود النماذج الافتراضي', before: before.ai.defaultProvider, after: after.ai.defaultProvider },
    { path: 'ai.defaultModel', label: 'النموذج الافتراضي', before: before.ai.defaultModel, after: after.ai.defaultModel },
    { path: 'ai.requestsPerMinute', label: 'حد الطلبات في الدقيقة', before: before.ai.requestsPerMinute, after: after.ai.requestsPerMinute },
    { path: 'ai.maxConcurrentRequests', label: 'الطلبات المتزامنة', before: before.ai.maxConcurrentRequests, after: after.ai.maxConcurrentRequests },
  ];
  return fields.filter(item => item.before !== item.after).map(item => ({
    field: item.path, label: item.label, before: displayValue(item.before), after: displayValue(item.after),
  }));
}

export function createSettingsHistoryEntry(
  previousSettings: PlatformSettings,
  nextSettings: PlatformSettings,
  sequence: number,
  timestamp = new Date().toISOString(),
): SettingsHistoryEntry | null {
  const changes = diffPlatformSettings(previousSettings, nextSettings);
  if (!changes.length) return null;
  return {
    id: `CFG-DEMO-${String(sequence).padStart(4, '0')}`,
    timestamp,
    summary: `تغيير ${changes.length} من إعدادات المنصة`,
    changes,
    previousSettings: clonePlatformSettings(previousSettings),
  };
}

export function parseStoredPlatformSettings(raw: string | null): { settings: PlatformSettings; history: SettingsHistoryEntry[] } {
  if (!raw) return { settings: clonePlatformSettings(DEFAULT_PLATFORM_SETTINGS), history: [] };
  try {
    const parsed = JSON.parse(raw) as { settings?: PlatformSettings; history?: SettingsHistoryEntry[] };
    if (!parsed.settings || validatePlatformSettings(parsed.settings).length) {
      return { settings: clonePlatformSettings(DEFAULT_PLATFORM_SETTINGS), history: [] };
    }
    const history = Array.isArray(parsed.history) ? parsed.history.filter(entry =>
      entry && typeof entry.id === 'string' && typeof entry.timestamp === 'string' &&
      typeof entry.summary === 'string' && Array.isArray(entry.changes) &&
      entry.changes.every(change => change && typeof change.label === 'string' && typeof change.before === 'string' && typeof change.after === 'string') &&
      entry.previousSettings && validatePlatformSettings(entry.previousSettings).length === 0
    ).slice(0, 8) : [];
    return { settings: clonePlatformSettings(parsed.settings), history };
  } catch {
    return { settings: clonePlatformSettings(DEFAULT_PLATFORM_SETTINGS), history: [] };
  }
}

export function settingsJsonExport(settings: PlatformSettings): string {
  // The schema intentionally contains no API keys, passwords, or connection credentials.
  return JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), settings }, null, 2);
}
