/**
 * Safely format a date string or Date object to DD/MM/YYYY without timezone shifts.
 * Prevents "2026-08-03" from parsing as midnight UTC and shifting back to "02/08/2026"
 * for users in Western timezones (e.g. Brazil UTC-3, Colombia UTC-5),
 * while also correctly formatting UTC timestamps created from Europe/Madrid midnight (e.g. 2026-10-01T22:00:00Z -> 02/10/2026).
 */
export function formatDateClean(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return 'N/A';

    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        // Pure YYYY-MM-DD pattern (no time component)
        const pureDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (pureDateMatch) {
            const [, year, month, day] = pureDateMatch;
            return `${day}/${month}/${year}`;
        }
    }

    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return 'N/A';

        // Format according to Europe/Madrid timezone (the operational timezone of MCS)
        return d.toLocaleDateString('pt-BR', {
            timeZone: 'Europe/Madrid',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return 'N/A';
    }
}
