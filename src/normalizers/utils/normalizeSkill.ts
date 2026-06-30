// ---------------------------------------------------------------------------
// normalizeSkill.ts
// Normalizes a list of `Skill` objects.
//
// Steps applied to each skill:
//   1. Trim the name.
//   2. Resolve alias → canonical name using the alias map.
//   3. Deduplicate by canonical name (case-insensitive).
//   4. Sort the result alphabetically by canonical name.
//
// The alias map is configurable: callers can pass a custom map that is merged
// on top of the built-in defaults.
//
// Pure function — no mutations, no side effects.
// ---------------------------------------------------------------------------

import type { Skill } from '../../models/common';
import { DEFAULT_SKILL_ALIASES, type SkillAliasMap } from './skillAliases';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalizes a `Skill[]` by resolving aliases, deduplicating, and sorting.
 *
 * @param skills      - Raw skill list from a CSV row or resume parser.
 * @param customAliases - Optional extra mappings merged on top of the defaults.
 *                        Keys must be lowercase; values are canonical names.
 * @returns A new, sorted, deduplicated array of skills with canonical names.
 */
export function normalizeSkills(
  skills: Skill[],
  customAliases: SkillAliasMap = {},
): Skill[] {
  const aliasMap = buildAliasMap(customAliases);

  const seen = new Set<string>(); // canonical name, lowercased
  const result: Skill[] = [];

  for (const skill of skills) {
    const trimmed = skill.name.trim();
    if (!trimmed) continue;

    const canonical = resolveAlias(trimmed, aliasMap);
    const key = canonical.toLowerCase();

    if (seen.has(key)) continue; // deduplicate
    seen.add(key);

    result.push({ ...skill, name: canonical });
  }

  // Sort alphabetically by canonical name (case-insensitive)
  result.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return result;
}

/**
 * Resolves a single raw skill name to its canonical form.
 * If no alias is found, the original (trimmed) value is returned unchanged.
 *
 * @param raw      - A raw skill name string.
 * @param aliasMap - The combined alias map to use for lookup.
 */
export function resolveSkillAlias(raw: string, customAliases: SkillAliasMap = {}): string {
  const aliasMap = buildAliasMap(customAliases);
  return resolveAlias(raw.trim(), aliasMap);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Builds the final alias map by merging custom entries on top of defaults.
 * Both default and custom keys are stored lowercase.
 */
function buildAliasMap(customAliases: SkillAliasMap): SkillAliasMap {
  const merged: SkillAliasMap = {};
  for (const [k, v] of Object.entries(DEFAULT_SKILL_ALIASES)) {
    merged[k.toLowerCase()] = v;
  }
  for (const [k, v] of Object.entries(customAliases)) {
    merged[k.toLowerCase()] = v;
  }
  return merged;
}

/**
 * Looks up the canonical name for `raw` in `aliasMap`.
 * Falls back to the original string when no mapping exists.
 */
function resolveAlias(raw: string, aliasMap: SkillAliasMap): string {
  return aliasMap[raw.toLowerCase()] ?? raw;
}
