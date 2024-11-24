import bcd from '@mdn/browser-compat-data' with { type: 'json' }

export const ecmaBuiltins = Object.keys(bcd.javascript.builtins)

export const nodeSupportedGlobals = Object.keys(bcd.api).filter(
	(el) => bcd.api[el].__compat?.support.nodejs,
)
