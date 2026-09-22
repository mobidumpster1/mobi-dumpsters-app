// Stands in for the real "server-only" package (which throws when
// imported outside Next's own bundler — see its own package source) so
// files that import it transitively (src/lib/session.ts) can still be
// imported directly by these plain-Node Vitest tests. Aliased in
// vitest.config.ts; genuinely does nothing.
export {};
