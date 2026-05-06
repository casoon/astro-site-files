export function renderSecurityTxt(options) {
    const lines = [];
    const contacts = Array.isArray(options.contact) ? options.contact : [options.contact];
    for (const contact of contacts) {
        lines.push(`Contact: ${contact}`);
    }
    if (options.expires) {
        const expires = options.expires instanceof Date
            ? options.expires.toISOString()
            : options.expires;
        lines.push(`Expires: ${expires}`);
    }
    if (options.encryption) {
        lines.push(`Encryption: ${options.encryption}`);
    }
    if (options.acknowledgments) {
        lines.push(`Acknowledgments: ${options.acknowledgments}`);
    }
    if (options.preferredLanguages?.length) {
        lines.push(`Preferred-Languages: ${options.preferredLanguages.join(', ')}`);
    }
    if (options.canonical) {
        lines.push(`Canonical: ${options.canonical}`);
    }
    if (options.policy) {
        lines.push(`Policy: ${options.policy}`);
    }
    if (options.hiring) {
        lines.push(`Hiring: ${options.hiring}`);
    }
    return lines.join('\n') + '\n';
}
