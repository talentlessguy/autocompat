import { readFileSync } from 'node:fs'
import {
	type CallExpression,
	type ExpressionStatement,
	parseSync,
} from 'oxc-parser'

export const parseLanguageTokens = (file: string) => {
	const source = readFileSync(file, 'utf-8')
	const { program } = parseSync(source)

	// console.log(JSON.stringify(program.body, null, 2))

	const elements: Set<string> = new Set()

	const findTokens = (node: any) => {
		if (!node) return
		if (node.type === 'VariableDeclaration') {
			if (node.kind !== 'var') elements.add(node.kind)
		} else if (node.type === 'ExpressionStatement') {
			findExpression(node)
		}
	}

	const detectEcmaBuiltin = async (expr: CallExpression) => {
		if (expr.callee.type === 'StaticMemberExpression') {
			if (expr.callee.object.type === 'Identifier') {
				// console.log(expr)
			} else if (expr.callee.object.type === 'ArrayExpression') {
				elements.add(`Array.prototype.${expr.callee.property.name}`)
			}
		}
	}

	const findExpression = (node: any) => {
		if (!node || !('expression' in node)) return

		switch ((node as ExpressionStatement).expression.type) {
			case 'ChainExpression':
				findExpression(node.expression)
				break
			case 'StaticMemberExpression':
				if (node.expression.optional) elements.add('?.')
				break
			case 'CallExpression':
				detectEcmaBuiltin(node.expression)
				for (const arg of node.expression.arguments) {
					if (arg.type.includes('Expression')) {
						findExpression(arg)
					}
				}
				break
		}
	}

	for (const item of program.body) {
		findTokens(item)
	}

	return elements
}
