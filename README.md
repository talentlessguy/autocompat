# autocompat

Automatically check runtime compatibility and configure package manifest and tooling based on that. ES6+.

## How it works

All files in the project, including dependencies, are scanned for globals. Afterwards, they're compared against a node.green dataset.