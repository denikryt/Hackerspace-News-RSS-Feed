// One resource policy shared by ingress, render and CLI configuration. All byte
// ceilings are inclusive. Docker must also apply its own OS memory ceiling.
const DEFAULTS = {
 htmlMaxBodyBytes: 8 * 1024 ** 2, feedMaxBodyBytes: 4 * 1024 ** 2,
 icsMaxBodyBytes: 8 * 1024 ** 2, spaceApiMaxBodyBytes: 1024 ** 2,
 maxFeedItems: 500, artifactMaxBytes: 32 * 1024 ** 2,
 pageTextMaxBytes: 16 * 1024 ** 2, concurrency: 4,
 builderMemoryMiB: 1024, nodeOldSpaceMiB: 768,
};
const ENV_KEYS = {
 htmlMaxBodyBytes:'HTML_MAX_BODY_BYTES',feedMaxBodyBytes:'FEED_MAX_BODY_BYTES',
 icsMaxBodyBytes:'ICS_MAX_BODY_BYTES',spaceApiMaxBodyBytes:'SPACE_API_MAX_BODY_BYTES',
 maxFeedItems:'MAX_FEED_ITEMS',artifactMaxBytes:'RENDER_ARTIFACT_MAX_BYTES',
 pageTextMaxBytes:'RENDER_PAGE_TEXT_MAX_BYTES',concurrency:'BUILD_CONCURRENCY',
 builderMemoryMiB:'BUILDER_MEMORY_MIB',nodeOldSpaceMiB:'NODE_OLD_SPACE_MIB',
};
// Reject ambiguous units and V8 ceilings which would consume the whole cgroup.
export function readResourceLimits(env = process.env) {
 const limits = { ...DEFAULTS };
 for (const [key, name] of Object.entries(ENV_KEYS)) {
  if (env[name] === undefined) continue;
  if (!/^\d+$/.test(env[name]) || !Number.isSafeInteger(Number(env[name])) || Number(env[name]) < 1) throw new Error(`Invalid resource limit ${name}`);
  limits[key] = Number(env[name]);
 }
 const matches = [...(env.NODE_OPTIONS || '').matchAll(/--max[-_]old[-_]space[-_]size(?:=|\s+)(\d+)/g)];
 const heap = matches.length ? Number(matches.at(-1)[1]) : limits.nodeOldSpaceMiB;
 if (heap >= limits.builderMemoryMiB || limits.nodeOldSpaceMiB >= limits.builderMemoryMiB) throw new Error('Node old-space must be smaller than builder memory');
 return Object.freeze(limits);
}
export const RESOURCE_LIMITS = readResourceLimits();
