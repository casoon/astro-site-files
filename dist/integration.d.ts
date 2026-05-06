import type { SiteFilesOptions } from './types.js';
interface AstroIntegration {
    name: string;
    hooks: Record<string, unknown>;
}
export default function siteFiles(options?: SiteFilesOptions): AstroIntegration;
export {};
