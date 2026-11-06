// `next` is an optional peer of better-auth. Without this, pnpm links it to every
// better-auth instance and `pnpm deploy --prod` ships Next.js in the backend image.
function readPackage(pkg) {
  if (pkg.name !== "better-auth") return pkg;

  delete pkg.peerDependencies?.next;
  delete pkg.peerDependenciesMeta?.next;
  return pkg;
}

module.exports = { hooks: { readPackage } };
