export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')        // remove extension
    .replace(/[-_]+/g, ' ')         // replace hyphens/underscores with space
    .replace(/[^a-zA-Z0-9 .]/g, '') // remove special chars
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200) || 'Untitled Contract'
}
