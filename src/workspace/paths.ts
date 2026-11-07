import { realpathSync } from "node:fs";
import path from "node:path";

export class PathOutsideWorkspaceError extends Error {
  constructor(requested: string) {
    super(`Path is outside the workspace: ${requested}`);
    this.name = "PathOutsideWorkspaceError";
  }
}

function isInside(root: string, target: string): boolean {
  // Compare with a trailing separator so "/work-evil" is not inside "/work".
  return target === root || target.startsWith(root + path.sep);
}

/**
 * Resolve `requested` (relative to the workspace, or absolute) to a real path
 * that is guaranteed to be inside the workspace. Symlinks are resolved first,
 * so a link pointing outside is rejected. Throws PathOutsideWorkspaceError.
 */
export function resolveInWorkspace(workspace: string, requested: string): string {
  const root = realpathSync(workspace);
  const candidate = path.resolve(root, requested);

  let real = candidate;
  try {
    real = realpathSync(candidate);
  } catch {
    // Path does not exist yet: check the lexical path, and the nearest existing parent below.
    const parent = path.dirname(candidate);
    try {
      real = path.join(realpathSync(parent), path.basename(candidate));
    } catch {
      real = candidate;
    }
  }

  if (!isInside(root, real)) throw new PathOutsideWorkspaceError(requested);
  return real;
}
