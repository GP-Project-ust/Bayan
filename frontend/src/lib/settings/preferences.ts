/**
 * Screen 06 — browser-only demonstration settings.
 * These preferences are NOT an authorization or server-side profile.
 * Never store authentication secrets or policy decisions here.
 */
export type Density = "comfortable" | "compact";
export type FontScale = "100" | "110" | "120";
export type ReportFormat = "pdf" | "excel" | "csv";
export type PreferenceKey = keyof UserPreferences;
export interface UserPreferences {
  density: Density;
  fontScale: FontScale;
  reduceMotion: boolean;
  inAppNotifications: boolean;
  reportNotifications: boolean;
  emailNotifications: boolean;
  sendOnEnter: boolean;
  showSources: boolean;
  showSql: boolean;
  defaultReportFormat: ReportFormat;
}
export const demoStorageKey = "bayan.demo.settings.v1";
export const defaultPreferences: UserPreferences = {
  density: "comfortable",
  fontScale: "100",
  reduceMotion: false,
  inAppNotifications: true,
  reportNotifications: true,
  emailNotifications: false,
  sendOnEnter: true,
  showSources: true,
  showSql: false,
  defaultReportFormat: "pdf",
};
const choice = <T extends string>(value:unknown, allowed:readonly T[], fallback:T):T =>
  typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
/** Strictly validate untrusted storage values; discard unknown keys. */
export function sanitizePreferences(value:unknown):UserPreferences {
  const item = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : {};
  const result = {...defaultPreferences};
  for (const key of ["reduceMotion","inAppNotifications","reportNotifications","emailNotifications","sendOnEnter","showSources","showSql"] as const) {
    result[key] = typeof item[key] === "boolean" ? item[key] as boolean : defaultPreferences[key];
  }
  result.density = choice(item.density,["comfortable","compact"],defaultPreferences.density);
  result.fontScale = choice(item.fontScale,["100","110","120"],defaultPreferences.fontScale);
  result.defaultReportFormat = choice(item.defaultReportFormat,["pdf","excel","csv"],defaultPreferences.defaultReportFormat);
  return result;
}
export function readDemoPreferences(raw:string|null):UserPreferences {
  if(!raw)return {...defaultPreferences};
  try {return sanitizePreferences(JSON.parse(raw));}
  catch {return {...defaultPreferences};}
}
export function writeDemoPreferences(prefs:UserPreferences):string {
  return JSON.stringify(sanitizePreferences(prefs));
}
/**
 * Visibility is a UI hint only. SQL is delivered exclusively by an authorized
 * API; hiding the component must never substitute for endpoint enforcement.
 */
export function effectivePreferences(prefs:UserPreferences, caps:{sql:boolean;reports:boolean;citations:boolean}):UserPreferences {
  const clean = sanitizePreferences(prefs);
  return {...clean, showSql: caps.sql && clean.showSql, showSources: caps.citations && clean.showSources,
    defaultReportFormat: caps.reports ? clean.defaultReportFormat : "pdf"};
}
export function preferencesEqual(a:UserPreferences,b:UserPreferences):boolean {
  return writeDemoPreferences(a) === writeDemoPreferences(b);
}
