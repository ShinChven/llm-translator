import { readFile } from "node:fs/promises";

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;

function fail(message) {
  console.error(`Release validation failed: ${message}`);
  process.exit(1);
}

if (!tag) {
  fail("provide a release tag such as v0.1.0.");
}

const match =
  /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/.exec(
    tag,
  );
if (!match) {
  fail(
    `"${tag}" is invalid. Use vMAJOR.MINOR.PATCH or a prerelease tag such as v1.2.0-beta.1.`,
  );
}

const releaseVersion = tag.slice(1);
const manifestVersion = `${match[1]}.${match[2]}.${match[3]}`;
const [packageJson, packageLock, manifest] = await Promise.all([
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../package-lock.json", import.meta.url), "utf8").then(
    JSON.parse,
  ),
  readFile(new URL("../public/manifest.json", import.meta.url), "utf8").then(
    JSON.parse,
  ),
]);

if (packageJson.version !== releaseVersion) {
  fail(
    `tag ${tag} does not match package.json version ${packageJson.version}.`,
  );
}

if (
  packageLock.version !== releaseVersion ||
  packageLock.packages?.[""]?.version !== releaseVersion
) {
  fail(`package-lock.json does not match package.json version ${releaseVersion}.`);
}

if (manifest.version !== manifestVersion) {
  fail(
    `Chrome manifest version ${manifest.version} must match ${manifestVersion}.`,
  );
}

console.log(
  `Validated ${tag}: package ${releaseVersion}, extension ${manifestVersion}.`,
);
