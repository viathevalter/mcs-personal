/**
 * Safely format a date string or Date object to DD/MM/YYYY without timezone shifts.
 * Prevents "2026-08-03" from parsing as midnight UTC and shifting back to "02/08/2026"
 * for users in Western timezones (e.g. Brazil UTC-3, Colombia UTC-5).
 */
export function formatDateClean(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return 'N/A';

    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        // Check for YYYY-MM-DD pattern
        const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
            const [, year, month, day] = dateMatch;
            return `${day}/${month}/${year}`;
        }
    }

    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return 'N/A';
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return 'N/A';
    }
}
