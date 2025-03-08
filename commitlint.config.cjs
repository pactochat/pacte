module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [
			2, // Level of enforcement (2 means "error")
			'always', // When to enforce (always check)
			[
				'build',
				'ci',
				'chore',
				'docs',
				'feat',
				'fix',
				'improv',
				'refactor',
				'test',
			],
		],
		'scope-empty': [0], // Allow commits without scope
		'scope-case': [2, 'always', 'lower-case'],
		'scope-enum': [0], // Allow any scope
		'subject-case': [0],
		'header-max-length': [2, 'always', 200],
		'body-max-line-length': [2, 'always', 400],
	},
}
