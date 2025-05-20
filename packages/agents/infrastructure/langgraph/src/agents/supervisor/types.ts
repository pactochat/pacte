import { Annotation, MessagesAnnotation } from '@langchain/langgraph'
import { z } from 'zod'

import type { LanguageCode } from '@pacto-chat/shared-domain'

// Define the supervisor state
export const SupervisorAnnotation = Annotation.Root({
	// Messages for conversation history
	messages: MessagesAnnotation.spec.messages,

	// Context for storing additional information
	context: Annotation<{
		question?: string
		language?: LanguageCode
		additionalContext?: Record<string, unknown>
	}>({
		reducer: (prev, next) => ({ ...prev, ...next }),
		default: () => ({}),
	}),

	// Language detection
	languageDetected: Annotation<LanguageCode>({
		reducer: (_prev, next) => next,
		default: () => 'cat',
	}),

	// Routing
	next: Annotation<
		'summarizer' | 'impact' | 'simplifier' | 'planner' | 'general'
	>(),

	// Error handling
	error: Annotation<string | null>({
		reducer: (_prev, next) => next,
		default: () => null,
	}),
})

// Export types for the supervisor
export type SupervisorState = typeof SupervisorAnnotation.State
export type SupervisorUpdate = typeof SupervisorAnnotation.Update

// Configuration for the supervisor
export const SupervisorZodConfiguration = z.object({
	/**
	 * The model ID to use for the agent.
	 */
	model: z
		.string()
		.optional()
		.describe('The model to use for the supervisor agent'),

	/**
	 * The temperature to use for generation.
	 */
	temperature: z
		.number()
		.optional()
		.describe(
			'Controls randomness in generation (0 = deterministic, 1 = creative)',
		),
})
