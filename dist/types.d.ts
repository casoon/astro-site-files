export interface RobotsOptions {
    disallow?: string[];
    allow?: string[];
    /** true = auto-derive from site URL, string = explicit URL, false = omit */
    sitemap?: boolean | string;
    crawlDelay?: number;
    agents?: Array<{
        userAgent: string | string[];
        allow?: string[];
        disallow?: string[];
        crawlDelay?: number;
    }>;
}
export interface LlmsOptions {
    title: string;
    description?: string;
    details?: string;
    sections?: Array<{
        title: string;
        links?: Array<{
            title: string;
            url: string;
            description?: string;
        }>;
    }>;
}
export interface SecurityOptions {
    /** Required by RFC 9116 — mailto: or https: URI */
    contact: string | string[];
    policy?: string;
    acknowledgments?: string;
    preferredLanguages?: string[];
    /** ISO date string or Date — required by spec */
    expires?: string | Date;
    encryption?: string;
    hiring?: string;
    canonical?: string;
}
export interface HumansTeamMember {
    name: string;
    role?: string;
    twitter?: string;
    location?: string;
    email?: string;
}
export interface HumansOptions {
    team?: HumansTeamMember[];
    thanks?: string[];
    technology?: string[];
    note?: string;
    /** Defaults to today's date */
    lastUpdate?: string | Date;
}
export interface SiteFilesOptions {
    /** robots.txt — enabled by default */
    robots?: RobotsOptions | boolean;
    /** llms.txt — disabled unless configured */
    llms?: LlmsOptions | boolean;
    /** sitemap.xml via @casoon/astro-sitemap — enabled by default */
    sitemap?: Record<string, unknown> | boolean;
    /** /.well-known/security.txt — disabled unless configured with contact */
    security?: SecurityOptions | boolean;
    /** humans.txt — disabled unless configured */
    humans?: HumansOptions | boolean;
    debug?: boolean;
}
