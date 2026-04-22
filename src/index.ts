#!/usr/bin/env node

import * as FS from "node:fs";
import * as Path from "node:path";
import OXC from "oxc-parser";
import picomatch from "picomatch";
import {
	print,
	printError,
	printFailure,
	printImport,
	printSuccess,
	printTitle,
	printViolation,
} from "./print.js";

const time0 = Date.now();
printTitle("Check for barrel import violations...");

const tsconfigPath = process.argv[2];
if (!tsconfigPath) {
	console.error();
	printError(
		"Usage: check-barrel-import-violation <path-to-tsconfig.json> [files...]",
	);
	console.error();
	process.exit(2);
}

const absoluteTsconfigPath = Path.resolve(tsconfigPath);
if (!FS.existsSync(absoluteTsconfigPath)) {
	printError(`File not found: ${absoluteTsconfigPath}`);
	process.exit(3);
}

const tsconfig = JSON.parse(FS.readFileSync(absoluteTsconfigPath, "utf-8"));
const rootDir = Path.dirname(absoluteTsconfigPath);
const baseUrl = tsconfig.compilerOptions?.baseUrl
	? Path.resolve(rootDir, tsconfig.compilerOptions.baseUrl)
	: rootDir;
const aliases = buildAliases(tsconfig.compilerOptions?.paths ?? {}, baseUrl);
const include: string[] = tsconfig.include ?? ["**/*"];
const exclude: string[] = tsconfig.exclude ?? ["node_modules"];

const extraFiles = process.argv.slice(3);
const sourceFiles =
	extraFiles.length > 0
		? extraFiles.map((f) => Path.resolve(f))
		: collectSourceFiles(rootDir, include, exclude);
print("Analysing ", sourceFiles.length, " files");
let errorCount = 0;

for (const filePath of sourceFiles) {
	errorCount += checkFile(filePath);
}

print(sourceFiles.length, " files processed in ", Date.now() - time0, " ms");
if (errorCount > 0) {
	printFailure(errorCount, " barrel import violation(s) found.");
	process.exit(1);
} else {
	printSuccess("No barrel import violations found.");
}

function checkFile(filePath: string): number {
	const text = FS.readFileSync(filePath, "utf-8");
	const { program } = OXC.parseSync(filePath, text);
	const dir = Path.dirname(filePath);
	let count = 0;

	for (const node of program.body) {
		if (node.type !== "ImportDeclaration") continue;

		const src = node.source;
		const importPath = src.value as string;
		const aliasResolved = resolveAlias(importPath, aliases);
		if (!aliasResolved) continue;

		const resolved = Path.isAbsolute(aliasResolved)
			? aliasResolved
			: Path.resolve(dir, aliasResolved);
		const segments = Path.relative(dir, resolved).split(Path.sep);

		let current = dir;
		for (let i = 0; i < segments.length - 1; i++) {
			const segment = segments[i];
			current = Path.join(current, segment);
			if (segment === "..") continue;

			if (
				FS.existsSync(Path.join(current, "index.ts")) ||
				FS.existsSync(Path.join(current, "index.tsx"))
			) {
				const line = text.slice(0, src.start).split("\n").length;
				const fixPath = `./${Path.relative(dir, current).replace(/\\/g, "/")}`;
				const rel = Path.relative(rootDir, filePath);
				printViolation(rel, line);
				printImport(Path.relative(dir, resolved), fixPath);
				count++;
				break;
			}
		}
	}
	return count;
}

interface Alias {
	prefix: string;
	targets: string[];
}

function buildAliases(paths: Record<string, string[]>, base: string): Alias[] {
	return Object.entries(paths).map(([key, targets]) => ({
		prefix: key.replace(/\*$/, ""),
		targets: targets.map((t) => Path.resolve(base, t.replace(/\*$/, ""))),
	}));
}

function resolveAlias(importPath: string, aliases: Alias[]): string | null {
	if (importPath.startsWith(".")) return importPath;

	for (const { prefix, targets } of aliases) {
		if (importPath.startsWith(prefix)) {
			const rest = importPath.slice(prefix.length);
			for (const target of targets) {
				const candidate = Path.join(target, rest);
				if (
					FS.existsSync(candidate) ||
					FS.existsSync(`${candidate}.ts`) ||
					FS.existsSync(`${candidate}.tsx`)
				)
					return candidate;
			}
			return Path.join(targets[0], rest);
		}
	}
	return null;
}

function collectSourceFiles(
	root: string,
	include: string[],
	exclude: string[],
): string[] {
	const extensions = [".ts", ".tsx"];
	const excludeSet = new Set(
		exclude.map((e) => Path.resolve(root, e.replace(/\/\*\*?\/?\*?$/, ""))),
	);
	excludeSet.add(Path.resolve(root, ".git"));
	const files: string[] = [];

	const matchesInclude = picomatch(include);

	function walk(dir: string) {
		for (const entry of FS.readdirSync(dir, { withFileTypes: true })) {
			if (entry.name.startsWith(".")) continue;

			const full = Path.join(dir, entry.name);
			if (excludeSet.has(full)) continue;
			if (entry.isDirectory()) {
				walk(full);
			} else if (
				extensions.some((ext) => entry.name.endsWith(ext)) &&
				!entry.name.endsWith(".d.ts")
			) {
				const rel = Path.relative(root, full);
				if (matchesInclude(rel)) files.push(full);
			}
		}
	}

	walk(root);
	return files;
}
