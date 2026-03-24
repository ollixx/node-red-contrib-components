const { execFileSync } = require("child_process");

const allowedPatterns = [
    /^LICENSE$/,
    /^README\.md$/,
    /^package\.json$/,
    /^components\/(?:[^/]+\.js|[^/]+\.html)$/,
    /^components\/COMP_PROTOCOL\.md$/,
    /^components\/lib\/[^/]+\.js$/,
    /^components\/locales\/[A-Za-z-]+\/[^/]+\.(?:json|html)$/,
    /^examples\/[^/]+\.json$/,
    /^images\/[^/]+$/
];

const forbiddenPatterns = [
    /^\.github\//,
    /^\.vscode\//,
    /^components\/test\//,
    /^components\/uitest\//,
    /^components\/examples\//,
    /^coverage\//,
    /^review\.md$/,
    /^package-lock\.json$/
];

const requiredFiles = [
    "LICENSE",
    "README.md",
    "package.json",
    "components/component-start.js",
    "components/component-start.html",
    "components/component-return.js",
    "components/component-return.html",
    "components/run-component.js",
    "components/run-component.html",
    "components/locales/en-US/component-start.json",
    "components/locales/en-US/component-return.json",
    "components/locales/en-US/run-component.json",
    "examples/basic.json"
];

function npmCommand() {
    return process.platform === "win32" ? "npm.cmd" : "npm";
}

function readPackFiles() {
    const raw = execFileSync(npmCommand(), ["pack", "--dry-run", "--json"], {
        encoding: "utf8"
    });
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || !Array.isArray(parsed[0].files)) {
        throw new Error("unexpected npm pack --dry-run --json output");
    }
    return parsed[0].files.map((entry) => entry.path).sort();
}

function main() {
    const files = readPackFiles();
    const unexpectedFiles = files.filter((filePath) => {
        if (forbiddenPatterns.some((pattern) => pattern.test(filePath))) {
            return true;
        }
        return !allowedPatterns.some((pattern) => pattern.test(filePath));
    });

    const missingRequiredFiles = requiredFiles.filter((filePath) => !files.includes(filePath));

    if (unexpectedFiles.length > 0 || missingRequiredFiles.length > 0) {
        if (unexpectedFiles.length > 0) {
            console.error("Unexpected files in npm package:");
            unexpectedFiles.forEach((filePath) => console.error("- " + filePath));
        }
        if (missingRequiredFiles.length > 0) {
            console.error("Missing required files in npm package:");
            missingRequiredFiles.forEach((filePath) => console.error("- " + filePath));
        }
        process.exit(1);
    }

    console.log("npm pack dry-run validated", files.length, "files");
    files.forEach((filePath) => console.log("- " + filePath));
}

main();