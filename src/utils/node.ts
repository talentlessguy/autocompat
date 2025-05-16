import fs from './fs.json' with { type: 'json' }
import path from './path.json' with { type: 'json' }
import util from './util.json' with { type: 'json' }

const docs = { fs, path, util }
const supportedModules = Object.keys(docs) as (keyof typeof docs)[]

const lookupModule = (modules: any[], id: string) => {
	let introducedIn: string | undefined

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
	return introducedIn
}

export const fetchNodeDoc = (mod: string, id: string): string | undefined => {
	if (mod.includes('node:')) {
		mod = mod.slice(5)
	}

	if (mod.includes('fs')) {
		const { modules } = docs.fs.modules[0]
		if (mod === 'fs/promises') {
			return lookupModule([modules[0], modules[3]], id)
		}
		if (mod === 'fs') {
			if (id.includes('Sync')) {
				return lookupModule([modules[2], modules[3]], id)
			}
			return lookupModule([modules[1], modules[3]], id)
		}
	} else if (supportedModules.includes(mod as keyof typeof docs)) {
		const { modules } = docs[mod as keyof typeof docs]
		return lookupModule(modules, id)
	}
}
