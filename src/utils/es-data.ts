import { readFile, writeFile } from 'node:fs/promises'

interface ESResult {
	_successful: number
	_count: number
	_percent: number
}

type NodeTestResult = {
	_version: string
	_engine: string
} & Record<string, ESResult & Record<string, boolean | string>>

const loadData = async () => {
	let result: NodeTestResult
	try {
		result = JSON.parse(await readFile('./result.json', 'utf-8'))
	} catch {
		const url = `https://raw.githubusercontent.com/williamkapke/node-compat-table/gh-pages/results/v8/${process.versions.node}.json`

		const res = await fetch(url)

		result = (await res.json()) as NodeTestResult

		await writeFile('./result.json', JSON.stringify(result, null, 2))
	}
	return result
}

const result = await loadData()

type LanguageFeature = {
	esVersion: string
	featureType: string
	category: string
	feature: string
	passed: boolean
}

export const findEsFeature = async (
	feature: string,
): Promise<LanguageFeature[]> => {
	const search: Array<LanguageFeature> = Object.entries(result)
		.filter(([key]) => !key.startsWith('_'))
		.reverse()
		.flatMap(([version, info]) =>
			Object.entries(info)
				.filter(([key]) => !key.startsWith('_'))
				.filter(([key]) => key.includes(feature))
				.map(([key, value]) => {
					const info = key.split('›') as [string, string, string]
					return {
						esVersion: version,
						featureType: info[0],
						category: info[1],
						feature: info[2],
						passed: typeof value === 'string' ? false : value,
					}
				}),
		)

	return search.filter((el) => el.feature === 'basic support')
}
