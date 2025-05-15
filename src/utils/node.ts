import fs from './fs.json' with { type: 'json' }
import path from './path.json' with { type: 'json' }
import util from './util.json' with { type: 'json' }

const supportedModules = ['fs', 'fs/promises', 'fs', 'path', 'util']

const docs = { fs, path, util }

export const fetchNodeDoc = async (
	mod: string,
	id: string,
): Promise<string | undefined> => {
	if (mod.includes('node:')) {
		mod = mod.slice(5)
	}
	if (mod.includes('/')) {
		mod = mod.slice(0, mod.indexOf('/'))
	}
	if (!supportedModules.includes(mod)) return undefined

	const moduleIndices: number[] = []

	if (mod.startsWith('fs')) {
		moduleIndices.push(6)

		if (mod === 'fs/promises') {
			moduleIndices.push(3)
		} else {
			moduleIndices.push(4)
			if (id.includes('Sync')) moduleIndices.push(5)
		}
	} else {
		moduleIndices.push(0)
	}

	const json = docs[mod]

	if (!json) console.log(mod)

	let introducedIn: string | undefined

	const modules = []

	for (const moduleIndex of moduleIndices) {
		if (json.modules[moduleIndex]) modules.push(json.modules[moduleIndex])
	}

	for (const module of modules) {
		if ('methods' in module) {
			for (const method of module.methods) {
				if (method.name === id) {
					introducedIn = method.meta.added.at(-1)
					break
				}
			}
		}

		if (!introducedIn && 'classes' in module) {
			for (const className of module.classes) {
				for (const method of module.classes[className].methods) {
					if (method.name === id) {
						introducedIn = method.meta.added.at(-1)
						break
					}
				}
			}
		}
		if (!introducedIn && 'properties' in module) {
			for (const prop of module.properties) {
				for (const method of module.properties[prop].methods) {
					if (method.name === id) {
						introducedIn = method.meta.added.at(-1)
						break
					}
				}
			}
		}
	}

	if (typeof introducedIn === 'string') return introducedIn.slice(1)
}
