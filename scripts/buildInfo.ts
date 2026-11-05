export function resolveBuildInfo(
  version: string,
  sourceVersion: string | undefined,
  readRevision: () => string,
): { version: string; revision: string | null } {
  const revision = (value: string | undefined) => {
    const normalized = value?.trim();
    return normalized && /^[a-f\d]{7,40}$/i.test(normalized)
      ? normalized.slice(0, 7).toLowerCase()
      : null;
  };

  let resolvedRevision = revision(sourceVersion);
  if (!resolvedRevision) {
    try {
      resolvedRevision = revision(readRevision());
    } catch {
      resolvedRevision = null;
    }
  }

  return { version, revision: resolvedRevision };
}
