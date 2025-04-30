import { readFileSync } from 'node:fs'
import BCD from '@mdn/browser-compat-data' with { type: 'json' }
import type { Identifier } from '@mdn/browser-compat-data'
import ASTMetadataInferer from 'ast-metadata-inferer' with { type: 'json' }
import { parseSync } from 'oxc-parser'
import { finalFeatureVersion } from '../utils/bcd.js'

import type {
	CatchClause,
	ClassBody,
	Declaration,
	ExportSpecifier,
	Expression,
	IdentifierName,
	ImportDefaultSpecifier,
	ImportNamespaceSpecifier,
	ImportSpecifier,
	JSXAttributeItem,
	JSXChild,
	MethodDefinition,
	ModuleDeclaration,
	ObjectProperty,
	Pattern,
	PrivateIdentifier,
	Program,
	PropertyDefinition,
	SpreadElement,
	Statement,
	Super,
	SwitchCase,
	TemplateElement,
	VariableDeclarator,
} from 'oxc-parser'
export type Node =
	| Declaration
	| VariableDeclarator
	| Expression
	| ClassBody
	| CatchClause
	| MethodDefinition
	| ModuleDeclaration
	| ImportSpecifier
	| ImportDefaultSpecifier
	| ImportNamespaceSpecifier
	| ExportSpecifier
	| Pattern
	| PrivateIdentifier
	| Program
	| SpreadElement
	| Statement
	| Super
	| SwitchCase
	| TemplateElement
	| ObjectProperty
	| PropertyDefinition
	| JSXAttributeItem
	| JSXChild

export const parseCode = (file: string) => {
	const source = readFileSync(file, 'utf-8')
	const { program, module } = parseSync(file, source)

	const globals = new Map<string, string>()
	const languageFeatures = new Map<string, string>()
	const declaredVariables = new Set<string>()
	const nodeFeatures = new Map<string, string>()

	if (module.hasModuleSyntax) {
		languageFeatures.set('ESM', '12.17.0')
	}

	if (module.staticImports) {
		for (const { moduleRequest } of module.staticImports) {
			if (moduleRequest.value.includes('node:')) {
				nodeFeatures.set(
					'node: Protocol',
					module.hasModuleSyntax ? '14.13.1' : '16.0.0',
				)
			}
		}
	}

	if (module.dynamicImports.length > 0) {
		nodeFeatures.set('DynamicImport', '13.2.0')
	}

	const addToGlobals = (name: string) => {
		const metadata = (ASTMetadataInferer as any[]).find(
			(metadata) => metadata.protoChainId === name,
		)
		if (metadata) {
			if (metadata.compat.support.nodejs)
				globals.set(name, finalFeatureVersion(metadata.compat.support.nodejs))
		}
	}

	const traverse = (node: Node) => {
		switch (node.type) {
			case 'ImportDeclaration': {
				for (const attr of node.attributes) {
					if (attr.type === 'ImportAttribute') {
						if (
							attr.key.type === 'Identifier' &&
							attr.key.name === 'type' &&
							attr.value.type === 'Literal' &&
							attr.value.value === 'json'
						) {
							const version = finalFeatureVersion(
								BCD.javascript.statements.import.import_attributes.__compat
									.support.nodejs!,
							)
							languageFeatures.set(attr.type, version)
						}
					}
				}
				break
			}
			case 'PrivateIdentifier':
				languageFeatures.set(
					node.type,
					finalFeatureVersion(
						BCD.javascript.classes.private_class_methods.__compat?.support
							.nodejs!,
					),
				)

				break
			case 'AwaitExpression': {
				const version = finalFeatureVersion(
					BCD.javascript.operators.await.__compat?.support.nodejs!,
				)
				languageFeatures.set(node.type, version)
				traverse(node.argument)

				break
			}
			case 'ChainExpression':
				if (
					node.expression.type === 'CallExpression' ||
					node.expression.type === 'MemberExpression'
				) {
					if (node.expression.optional) {
						const version = finalFeatureVersion(
							BCD.javascript.operators.optional_chaining.__compat?.support
								.nodejs!,
						)
						languageFeatures.set('OptionalChaining', version)
					}
				}
				break
			case 'TemplateLiteral': {
				const version = finalFeatureVersion(
					BCD.javascript.grammar.template_literals.__compat?.support.nodejs!,
				)
				languageFeatures.set(node.type, version)

				break
			}
			case 'ClassDeclaration': {
				const version = finalFeatureVersion(
					(BCD.javascript.classes.constructor as unknown as Identifier).__compat
						?.support.nodejs!,
				)
				languageFeatures.set(node.type, version)
				traverse(node.body)
				break
			}
			case 'LogicalExpression':
				if (node.operator === '??') {
					const version = finalFeatureVersion(
						BCD.javascript.operators.nullish_coalescing.__compat?.support
							.nodejs!,
					)
					languageFeatures.set('NullishCoalescing', version)
				}
				break
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
				if (node.callee.type === 'MemberExpression') {
					if (
						node.callee.object.type === 'Identifier' &&
						!declaredVariables.has(node.callee.object.name)
					) {
						addToGlobals(
							`${node.callee.object.name}.${(node.callee.property as IdentifierName).name}`,
						)
					} else if (node.callee.object.type === 'ArrayExpression') {
						const arrayMethod = (node.callee.property as IdentifierName).name
						const version = finalFeatureVersion(
							BCD.javascript.builtins.Array[arrayMethod].__compat!.support
								.nodejs!,
						)
						languageFeatures.set(`Array.prototype.${arrayMethod}`, version)
					}
				} else if (
					node.callee.type === 'Identifier' &&
					!declaredVariables.has(node.callee.name)
				) {
					addToGlobals(node.callee.name)
				}
				break
			case 'MemberExpression':
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

	return new Map([...globals, ...languageFeatures, ...nodeFeatures])
}
