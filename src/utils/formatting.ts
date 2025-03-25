/**
 * Formats a camelCase key to Title Case with spaces
 * e.g. "solveEquation" becomes "Solve Equation"
 */
export function formatKeyToTitleCase(key: string): string {
    // First, add spaces before capital letters and make the entire string lowercase
    const withSpaces = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();

    // Then capitalize the first letter of each word
    return withSpaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}