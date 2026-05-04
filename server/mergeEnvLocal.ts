import fs from 'node:fs';
import path from 'node:path';

/** Escape a value for dotenv double-quoted strings. */
function dotenvEscape(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
}

/**
 * Merge/update variables into `.env.local` at project root (cwd).
 * Drops prior lines for the same keys, then appends new assignments.
 * Omits keys whose values are empty strings (does not erase existing keys unless you pass empty explicitly — caller decides).
 */
export function mergeIntoEnvLocal(cwd: string, updates: Record<string, string>): void {
  const filePath = path.join(cwd, '.env.local');
  const keysToReplace = new Set(Object.keys(updates));
  let lines: string[] = [];
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    lines = raw.split(/\r?\n/).filter((line) => {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(line.trim());
      if (m && keysToReplace.has(m[1])) return false;
      return true;
    });
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop();

  const appended = Object.entries(updates)
    .filter(([, v]) => v.trim().length > 0)
    .map(([k, v]) => `${k}="${dotenvEscape(v)}"`);

  const out = [...lines, ...appended, ''].join('\n');
  fs.writeFileSync(filePath, out, 'utf8');
}
