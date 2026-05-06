export function renderLlmsTxt(options) {
    const lines = [];
    lines.push(`# ${options.title}`);
    if (options.description) {
        lines.push('');
        lines.push(`> ${options.description}`);
    }
    if (options.details) {
        lines.push('');
        lines.push(options.details);
    }
    if (options.sections?.length) {
        for (const section of options.sections) {
            lines.push('');
            lines.push(`## ${section.title}`);
            if (section.links?.length) {
                lines.push('');
                for (const link of section.links) {
                    const desc = link.description ? `: ${link.description}` : '';
                    lines.push(`- [${link.title}](${link.url})${desc}`);
                }
            }
        }
    }
    return lines.join('\n') + '\n';
}
