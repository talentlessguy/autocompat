import { type Statement, parseSync } from 'oxc-parser'

const { program } = parseSync('const f = async () => x')

const tokens: string[] = []

const findDeclarations = (node: Statement) => {
	if (node.type === 'VariableDeclaration') {
		tokens.push(node.kind)
	}

	if ('declarations' in node) {
		for (const decl of node.declarations) {
			if (decl.init?.type === 'ArrowFunctionExpression')
		}
	}
}

for (const item of program.body) {
	findDeclarations(item)
}

console.log(tokens)
