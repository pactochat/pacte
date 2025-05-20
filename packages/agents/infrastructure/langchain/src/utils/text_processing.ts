/**
 * Convert Langchain MessageContent (string or array) to string
 */
export function messageContentToString(content: unknown): string {
	if (typeof content === 'string') return content
	if (Array.isArray(content)) {
		return content
			.map(c => {
				if (typeof c === 'string') return c
				if (
					typeof c === 'object' &&
					c &&
					'text' in c &&
					typeof c.text === 'string'
				)
					return c.text
				return ''
			})
			.join('')
	}
	return ''
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength = 100): string {
	if (text.length <= maxLength) return text
	return `${text.substring(0, maxLength - 3)}...`
}
