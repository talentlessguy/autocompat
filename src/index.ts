import { readFile } from 'node:fs/promises'
import path, { basename } from 'node:path'
import { styleText } from 'node:util'
import { glob } from 'tinyglobby'
import { parseCode } from './parser/parse.js'
import { type DependencyMetadata, getPackageFiles } from './utils/crawl.js'

export const scanFiles = async (deps: DependencyMetadata[], debug = false) => {
	const uniqueTokens = new Map<string, Map<string, string>>()
	for (const dep of deps) {
		const packageName = basename(dep.pkgDir)
		const filePaths = getPackageFiles(dep.pkgDir)
		const uniqueDepTokens = new Map<string, string>()
		for (const file of filePaths) {
			const tokens = parseCode(file)

			for (const [feature, compat] of tokens) {
				uniqueDepTokens.set(feature, compat)
			}
		}
		if (debug && uniqueDepTokens.size > 0) {
			console.log(styleText('gray', basename(dep.pkgDir)))
			console.table(Array.from(uniqueDepTokens.entries()))
		}
		uniqueTokens.set(packageName, uniqueDepTokens)
	}

	return uniqueTokens
}

export const scanSource = async (debug = false) => {
	const filesField = JSON.parse(
		await readFile(path.join(process.cwd(), 'package.json'), 'utf-8'),
	).files

	if (!filesField) throw new Error('Missing "files" field in package.json')

	const files: string[] = []

	for (const path of filesField) {
		files.push(
			...(await glob(path, {
				onlyFiles: true,
				ignore: ['**/*.js.map', '**/*.d.ts', '**/*.d.ts.map'],
			})),
		)
	}

	const uniqueTokens = new Map<string, string>()
	for (const file of files) {
		const tokens = parseCode(file)

		for (const [feature, compat] of tokens) {
			uniqueTokens.set(feature, compat)
		}

		if (debug && uniqueTokens.size > 0) {
			console.log(styleText('gray', basename(file)))
			console.table(Array.from(uniqueTokens.entries()))
		}
	}

	return uniqueTokens
}
