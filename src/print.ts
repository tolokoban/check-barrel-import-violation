import Chalk from "chalk";

export function printTitle(title: string) {
	console.log(Chalk.cyanBright.bold(title));
}

export function printError(message: string) {
	console.error(Chalk.bgRed.whiteBright(message));
}

export function print(...items: unknown[]) {
	console.log(joinItems(items));
}

export function printViolation(filename: string, linenumber: number) {
	console.error(
		Chalk.redBright("Violation in"),
		`${Chalk.cyan(filename)}:${Chalk.yellow(linenumber)}`,
	);
}

export function printImport(fullpath: string, barrelpath: string) {
	console.error(
		`import from "${Chalk.green(barrelpath)}${Chalk.redBright.bold.underline(fullpath.slice(barrelpath.length - 2))}"`,
	);
	console.log();
}

export function printFailure(...items: unknown[]) {
	console.error(Chalk.bgRed.whiteBright.bold(" FAILURE "), joinItems(items));
}

export function printSuccess(...items: unknown[]) {
	console.error(Chalk.bgGreen.whiteBright.bold(" SUCCESS "), joinItems(items));
}

function joinItems(items: unknown[]): string {
	const result = items
		.map((item) => {
			switch (typeof item) {
				case "string":
					return item;
				case "number":
					return Chalk.yellowBright(item);
				default:
					return Chalk.blueBright(JSON.stringify(item));
			}
		})
		.join("");
	return result;
}
