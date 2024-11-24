import { basename } from 'node:path'
import { CLI } from 'spektr'
import {
	crawlDependencies,
	findClosestPkgJsonPath,
	getPackageFiles,
} from './utils/crawl'

const cli = new CLI({ name: 'autocompat' })

cli.command(
	'crawl',
	(_, { limit }) => {
		const packageJsonPath = findClosestPkgJsonPath(process.cwd())
		const crawlLimit = limit ? Number.parseInt(limit) : Number.POSITIVE_INFINITY
		if (!packageJsonPath) {
			console.error(`No closest package.json found from ${process.cwd()}`)
			process.exit(1)
		}
		const dependencyMetadatas = crawlDependencies(packageJsonPath, crawlLimit)

		for (const dep of dependencyMetadatas) {
			console.log(basename(dep.pkgDir), getPackageFiles(dep.pkgDir))
		}
	},
	{
		options: [
			{
				name: 'limit',
				type: 'string',
				description: 'Limit the number of dependencies to crawl',
				required: false,
			},
		] as const,
	},
)

cli.handle(process.argv.slice(2))
