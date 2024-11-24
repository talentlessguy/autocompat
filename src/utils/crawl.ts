import fs from 'node:fs'
import path from 'node:path'

type PackageManifest = {
	name: string
	version: string
	dependencies?: Record<string, string>
	devDependencies?: Record<string, string>
	main?: string
	module?: string
	files?: string[]
}

export type DependencyMetadata = {
	pkgDir: string
	pkgGraphPath: string[]
	pkgVersion: string
	pkgJson: Partial<PackageManifest>
}

export function crawlDependencies(
	pkgJsonPath: string,
	limit: number,
): DependencyMetadata[] {
	const metadatas: DependencyMetadata[] = []

	crawl(path.dirname(pkgJsonPath), [], true)

	if (limit != null && metadatas.length >= limit) {
		return metadatas.slice(0, limit)
	}

	for (const metadata of metadatas) {
		crawl(metadata.pkgDir, metadata.pkgGraphPath)

		if (limit != null && metadatas.length >= limit) {
			break
		}
	}

	return metadatas

	function crawl(pkgDir: string, parentDepNames: string[], isRoot = false) {
		const pkgJsonContent = fs.readFileSync(
			path.join(pkgDir, 'package.json'),
			'utf8',
		)
		const pkgJson = JSON.parse(pkgJsonContent)
		const pkgDependencies = Object.keys(pkgJson.dependencies || {})

		if (isRoot) {
			pkgDependencies.push(...Object.keys(pkgJson.devDependencies || {}))
		}

		for (const depName of pkgDependencies) {
			// Prevent dep loop
			if (parentDepNames.includes(depName)) continue

			const depPkgJsonPath = findPkgJsonPath(depName, pkgDir)
			if (!depPkgJsonPath) continue

			const depPkgJson = JSON.parse(fs.readFileSync(depPkgJsonPath, 'utf8'))

			metadatas.push({
				pkgDir: path.dirname(depPkgJsonPath),
				pkgGraphPath: parentDepNames.concat(depPkgJson.name),
				pkgVersion: depPkgJson.version,
				pkgJson: depPkgJson,
			})

			if (limit != null && metadatas.length >= limit) {
				break
			}
		}
	}
}

export function findClosestPkgJsonPath(dir: string) {
	while (dir) {
		const pkg = path.join(dir, 'package.json')
		try {
			if (fs.existsSync(pkg)) {
				return pkg
			}
		} catch {}
		const nextDir = path.dirname(dir)
		if (nextDir === dir) break
		dir = nextDir
	}
	return undefined
}

export function findPkgJsonPath(pkgName: string, basedir: string) {
	while (basedir) {
		const pkg = path.join(basedir, 'node_modules', pkgName, 'package.json')
		try {
			if (fs.existsSync(pkg)) {
				return fs.realpathSync(pkg)
			}
		} catch {}
		const nextBasedir = path.dirname(basedir)
		if (nextBasedir === basedir) break
		basedir = nextBasedir
	}
	return undefined
}

const validExtensions = ['js', 'mjs', 'cjs', 'json']

export function getPackageFiles(dir: string) {
	const files = fs.readdirSync(dir, { recursive: true, withFileTypes: true })

	const filteredFiles = files.filter((file) =>
		validExtensions.some((ext) => file.name.endsWith(ext)),
	)

	return filteredFiles.map((file) => path.join(file.parentPath, file.name))
}
