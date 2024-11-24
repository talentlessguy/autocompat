interface ESResult {
	_successful: number
	_count: number
	_percent: number
}

type NodeTestResult = {
	_version: string
	_engine: string
} & Record<string, ESResult & Record<string, boolean | string>>

export const getESData = async (feature: string) => {
	const url = `https://raw.githubusercontent.com/williamkapke/node-compat-table/gh-pages/results/v8/${process.versions.node}.json`

	const res = await fetch(url)

	const result = (await res.json()) as NodeTestResult

	const search: Array<{
		esVersion: string
		featureType: string
		category: string
		feature: string
		passed: boolean
	}> = Object.entries(result)
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

	return search[0]
}

console.log(await getESData('await'))
