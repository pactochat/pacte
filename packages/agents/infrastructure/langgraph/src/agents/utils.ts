import { currentIsoDateTimeString } from '@pacto-chat/shared-domain'
import type { GraphStateStatus } from '../graph'

/**
 * Create a log entry for agent execution
 *
 * @param agent Name of the agent
 * @param status Status of the execution
 * @returns Log entry object
 */
export function logAgentExecution(agent: string, status: GraphStateStatus) {
	return {
		agent,
		timestamp: currentIsoDateTimeString(),
		status,
	}
}

/**
 * Calculate the complexity score of a text
 *
 * @param text Text to analyze
 * @returns Complexity score from 1-10
 */
export function calculateComplexityScore(text: string): number {
	// This is a simple placeholder implementation
	// In a real system, would use more sophisticated metrics

	const words = text.split(/\s+/).length
	const sentences = text.split(/[.!?]+/).length
	const longWords = text.split(/\s+/).filter(word => word.length > 6).length

	// Calculate average sentence length
	const avgSentenceLength = words / Math.max(sentences, 1)

	// Calculate percentage of long words
	const longWordPercentage = longWords / Math.max(words, 1)

	// Calculate base score (1-10)
	const baseScore = Math.min(
		10,
		Math.max(1, avgSentenceLength * 0.5 + longWordPercentage * 10),
	)

	return Math.round(baseScore * 10) / 10
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

/**
 * Extract key points from text
 *
 * @param text Text to analyze
 * @param numPoints Number of key points to extract
 * @returns Array of key points
 */
export function extractKeyPoints(text: string, numPoints = 3): string[] {
	// In a real implementation, this would use NLP techniques
	// This is just a placeholder

	// Split into sentences
	const sentences = text
		.split(/[.!?]+/)
		.map(s => s.trim())
		.filter(s => s.length > 10)

	// If not enough sentences, return what we have
	if (sentences.length <= numPoints) {
		return sentences
	}

	// Otherwise, select evenly distributed sentences
	const result: string[] = []
	const interval = Math.floor(sentences.length / numPoints)

	for (let i = 0; i < numPoints; i++) {
		const index = i * interval
		if (index < sentences.length) {
			const sentence = sentences[index]
			if (sentence !== undefined) {
				result.push(sentence)
			}
		}
	}

	return result
}

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
