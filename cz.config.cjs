/** @type {import('cz-customizable').Options} */
module.exports = {
	types: [
		{
			value: 'build',
			name: '🔧 build:    Changes that affect the build system or external dependencies',
		},
		{
			value: 'ci',
			name: '🔑 ci:       Changes to our CI configuration files and scripts',
		},
		{
			value: 'chore',
			name: '🛠️ chore:    Changes to the build process or auxiliary tools',
		},
		{
			value: 'docs',
			name: '📚 docs:     Documentation only changes',
		},
		{
			value: 'feat',
			name: '✨ feat:     A new feature',
		},
		{
			value: 'fix',
			name: '🐛 fix:      A bug fix',
		},
		{
			value: 'improv',
			name: '🚀 improv:   An improvement to existing functionality',
		},
		{
			value: 'refactor',
			name: '🔄 refactor: A code change that neither fixes a bug nor adds a feature',
		},
		{
			value: 'test',
			name: '🧪 test:     Adding missing tests or correcting existing tests',
		},
	],

	// scopes: ['services', 'scripts'],
	allowCustomScopes: true,
	allowBreakingChanges: ['fix', 'improv'],
	skipQuestions: ['footer'],
	subjectLimit: 200,

	messages: {
		// type: "Select the type of change that you're committing:",
		scope: '(optional) Predefined scope:',
		body: '(Optional) Provide a LONGER description of the change:\n',
		customScope:
			'(Optional) Specify a custom scope (apps-web, shared-ui-core):',
		// breaking: 'List any BREAKING CHANGES (optional):\n',
		// footer: 'Issues this commit closes, e.g., #123:',
		// confirmCommit: 'Are you sure you want to proceed with the commit above?',
	},
}
