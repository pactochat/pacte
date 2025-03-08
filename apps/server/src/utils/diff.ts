export function generateDiff(oldCode: string, newCode: string): string {
	// Minimal approach: show lines that changed. For real usage, integrate a library like 'diff'
	if (oldCode === newCode) return 'No changes'
	return `--- OLD\n${oldCode}\n--- NEW\n${newCode}`
}
