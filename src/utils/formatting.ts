export function formatKeyToTitleCase(key: string): string {
    const withSpaces = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();

    return withSpaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}