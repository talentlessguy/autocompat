import { basename } from 'node:path'
import { parseGlobals } from './parser/globals'
import { type DependencyMetadata, getPackageFiles } from './utils/crawl'

export const scanFiles = async (deps: DependencyMetadata[]) => {
	for (const dep of deps) {
		const packageName = basename(dep.pkgDir)
		const filePaths = getPackageFiles(dep.pkgDir)
		const uniqueTokens = new Map<string, string>()
		for (const file of filePaths) {
			const tokens = parseGlobals(file)

			for (const [feature, compat] of tokens) {
				uniqueTokens.set(feature, compat)
			}
		}
		for (const [feature, compat] of uniqueTokens) {
			console.log(packageName, feature, compat)
		}
	}
}
