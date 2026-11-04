/**
 * Jyotsvan Enterprise Platform - Environment Configuration
 * Centralized, validated environment configuration supporting both VITE_ and standard prefixes.
 */

export interface EnvConfig {
  projectId: string;
  apiUrl: string;
  anonKey: string;
  isInsforgeConfigured: boolean;
  appUrl: string;
  isProduction: boolean;
}

const DEFAULT_PROJECT_ID = '858f4w8c';
const DEFAULT_API_URL = 'https://858f4w8c.us-east.insforge.app';

const rawProjectId =
  (import.meta.env.VITE_INSFORGE_PROJECT_ID as string | undefined) ||
  (import.meta.env.INSFORGE_PROJECT_ID as string | undefined) ||
  DEFAULT_PROJECT_ID;

const rawApiUrl =
  (import.meta.env.VITE_INSFORGE_API_URL as string | undefined) ||
  (import.meta.env.INSFORGE_API_URL as string | undefined) ||
  DEFAULT_API_URL;

const rawAnonKey =
  (import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined) ||
  (import.meta.env.INSFORGE_ANON_KEY as string | undefined) ||
  '';

export const ENV: EnvConfig = {
  projectId: rawProjectId,
  apiUrl: rawApiUrl,
  anonKey: rawAnonKey,
  isInsforgeConfigured: Boolean(rawApiUrl),
  appUrl: (import.meta.env.APP_URL as string | undefined) || (typeof window !== 'undefined' ? window.location.origin : ''),
  isProduction: import.meta.env.PROD,
};
