import { basename } from 'node:path'
import { parseGlobals } from './parser/globals'
import { type DependencyMetadata, getPackageFiles } from './utils/crawl'

export const scanFiles = async (deps: DependencyMetadata[]) => {
	for (const dep of deps) {
		const packageName = basename(dep.pkgDir)
		const filePaths = getPackageFiles(dep.pkgDir)

		for (const file of filePaths) {
			const tokens = parseGlobals(file)

			for (const el of tokens) {
				console.log(el)
			}
		}
	}
}
