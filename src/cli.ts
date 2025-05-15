#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'

import { styleText } from 'node:util'
import prompts from 'prompts'
import gt from 'semver/functions/gt.js'
import { CLI } from 'spektr'
import { scanFiles, scanSource } from './index.js'
import {
	type PackageManifest,
	crawlDependencies,
	findClosestPkgJsonPath,
} from './utils/crawl.js'

const cli = new CLI({ name: 'autocompat' })

cli.command(
	async (_, { limit, debug }) => {
		const packageJsonPath = findClosestPkgJsonPath(process.cwd())
		console.log(`Found package.json at ${packageJsonPath}`)
		const crawlLimit = limit ? Number.parseInt(limit) : Number.POSITIVE_INFINITY
		if (!packageJsonPath) {
			console.error(`No closest package.json found from ${process.cwd()}`)
			process.exit(1)
		}
		const dependencyMetadatas = crawlDependencies(packageJsonPath, crawlLimit)
		console.log(
			`${styleText('yellow', dependencyMetadatas.length.toString())} dependencies in total`,
		)
		const packageTokens = await scanFiles(dependencyMetadatas, debug)
		const sourceTokens = await scanSource(debug)

		let minSourceVersion = '0.0.0'
		let minPackageVersion = '0.0.0'

		for (const version of sourceTokens.values()) {
			if (gt(version, minSourceVersion)) {
				minSourceVersion = version
			}
		}
		for (const versions of packageTokens.values()) {
			for (const version of versions.values()) {
				if (gt(version, minPackageVersion)) {
					minPackageVersion = version
				}
			}
		}
		console.log(
			`${styleText('gray', 'Minimum Node.js version for source:')} ${styleText('green', minSourceVersion)}`,
		)
		if (packageTokens.size > 0)
			console.log(
				`${styleText('gray', 'Minimum Node.js version for dependencies:')} ${styleText('green', minPackageVersion)}`,
			)

		const pkgJson: PackageManifest = JSON.parse(
			await readFile(packageJsonPath, 'utf-8'),
		)

		if (pkgJson?.engines?.node) {
			console.log(
				`Current engines.node value: ${styleText('bgCyan', pkgJson.engines.node)}`,
			)
		}

		const recommendedVersion = gt(minSourceVersion, minPackageVersion)
			? minSourceVersion
			: minPackageVersion

		if (`>=${recommendedVersion}` === pkgJson?.engines?.node) {
			console.log('Correct engines.node value already set')
			return
		}
		console.log(
			`Recommended engines.node value: ${styleText('bgGreen', `>=${recommendedVersion}`)}`,
		)

		const { confirm } = await prompts({
			type: 'confirm',
			name: 'confirm',
			message: 'Do you want to update package.json with a recommended version?',
		})
		if (confirm) {
			const pkgJson: PackageManifest = JSON.parse(
				await readFile(packageJsonPath, 'utf-8'),
			)
			await writeFile(
				packageJsonPath,
				JSON.stringify(
					{
						...pkgJson,
						engines: { ...pkgJson.engines, node: `>=${recommendedVersion}` },
					},
					null,
					2,
				),
			)
			console.log('Updated package.json')
		}
	},
	{
		default: true,
		options: [
			{
				name: 'limit',
				type: 'string',
				description: 'Limit the number of dependencies to crawl',
				required: false,
			},
			{
				name: 'debug',
				type: 'boolean',
				description: 'Enable debug mode',
				required: false,
			},
		] as const,
	},
)

cli.handle(process.argv.slice(2))
