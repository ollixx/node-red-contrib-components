const fs = require("fs");
const path = require("path");

const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const expectedTag = "v" + packageJson.version;
const releaseTag = process.argv[2] || process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME;

if (!releaseTag) {
    console.error("No release tag provided for version validation.");
    process.exit(1);
}

if (releaseTag !== expectedTag) {
    console.error("Release tag does not match package.json version.");
    console.error("Expected:", expectedTag);
    console.error("Received:", releaseTag);
    process.exit(1);
}

console.log("Validated release tag", releaseTag, "against package version", packageJson.version);