import { readFileSync } from 'node:fs'
import { type Expression, type Statement, parseSync } from 'oxc-parser'
import { ecmaBuiltins, nodeSupportedGlobals } from '../utils/apis'

export const parseGlobals = (file: string) => {
	const source = readFileSync(file, 'utf-8')
	const { program } = parseSync(source)

	const globals = new Set<string>()
	const declaredVariables = new Set<string>()

	const addToGlobals = (name: string) => {
		if (ecmaBuiltins.includes(name) || nodeSupportedGlobals.includes(name))
			globals.add(name)
	}

	const traverse = (node: Statement | Expression) => {
		switch (node.type) {
			case 'NewExpression':
				if (
					node.callee.type === 'Identifier' &&
					!declaredVariables.has(node.callee.name)
				) {
					addToGlobals(node.callee.name)
				}
				break
			case 'VariableDeclaration':
				node.declarations.forEach((declaration: any) => {
					if (declaration.id && declaration.id.type === 'Identifier') {
						declaredVariables.add(declaration.id.name) // Track declared variable
					}
					if (declaration.init) {
						traverse(declaration.init)
					}
				})
				break
			case 'AssignmentExpression':
				if (
					node.left.type === 'Identifier' &&
					!declaredVariables.has(node.left.name)
				) {
					addToGlobals(node.left.name)
				}
				break
			case 'CallExpression':
				if (node.callee.type === 'StaticMemberExpression') {
					if (
						node.callee.object.type === 'Identifier' &&
						!declaredVariables.has(node.callee.object.name)
					) {
						addToGlobals(
							`${node.callee.object.name}.${node.callee.property.name}`,
						)
					}
				} else if (
					node.callee.type === 'Identifier' &&
					!declaredVariables.has(node.callee.name)
				) {
					addToGlobals(node.callee.name)
				}
				break
			case 'StaticMemberExpression':
				if (
					node.object.type === 'Identifier' &&
					!declaredVariables.has(node.object.name)
				) {
					addToGlobals(node.object.name)
				}
				if (
					node.property.type === 'Identifier' &&
					!declaredVariables.has(node.property.name)
				) {
					addToGlobals(node.property.name)
				}
				break
			case 'ExpressionStatement':
				traverse(node.expression)
				break
			default:
				Object.keys(node).forEach((key) => {
					if (Array.isArray(node[key])) {
						node[key].forEach(traverse)
					} else if (typeof node[key] === 'object' && node[key] !== null) {
						traverse(node[key])
					}
				})
		}
	}

	// Start traversing from the program node
	for (const item of program.body) traverse(item)

	return globals
}
