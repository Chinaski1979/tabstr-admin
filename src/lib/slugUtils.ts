/**
 * Slug normalization utilities for organization slugs.
 * Ensures slugs are URL-safe, lowercase, and follow naming conventions.
 */

/**
 * Normalizes a string into a valid organization slug.
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes invalid characters (keeps only a-z, 0-9, and hyphens)
 * - Collapses multiple hyphens into one
 * - Removes leading/trailing hyphens
 * 
 * @example
 * normalizeSlug("Mi Restaurante Café") // "mi-restaurante-cafe"
 * normalizeSlug("Test___Restaurant!!!") // "test-restaurant"
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // espacios → guiones
    .replace(/[^a-z0-9-]/g, '')     // solo alfanuméricos y guiones
    .replace(/-+/g, '-')            // colapsar guiones múltiples
    .replace(/^-+|-+$/g, '');       // quitar guiones inicio/fin
}

/**
 * Generates a slug from an organization name.
 * Alias for normalizeSlug for semantic clarity.
 * 
 * @example
 * generateSlugFromName("Mi Empresa S.A.") // "mi-empresa-sa"
 */
export function generateSlugFromName(name: string): string {
  return normalizeSlug(name);
}

/**
 * Validates if a string is a valid organization slug.
 * Valid slugs must:
 * - Contain only lowercase letters, numbers, and hyphens
 * - Not start or end with a hyphen
 * - Not be empty
 * 
 * @example
 * isValidSlug("my-restaurant") // true
 * isValidSlug("My-Restaurant") // false (uppercase)
 * isValidSlug("-invalid-") // false (starts/ends with hyphen)
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length === 0) return false;
  if (slug.startsWith('-') || slug.endsWith('-')) return false;
  return /^[a-z0-9-]+$/.test(slug);
}
