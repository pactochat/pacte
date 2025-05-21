import type { LanguageCode } from '@aipacto/shared-domain'
import { Annotation, MessagesAnnotation } from '@langchain/langgraph'
import { END } from '@langchain/langgraph'

// Agent supervisor loop state with context
export const SupervisorAnnotation = Annotation.Root({
	// Messages for conversation history
	messages: MessagesAnnotation.spec.messages,

	// Context for storing additional information
	context: Annotation<{
		question?: string
		language?: LanguageCode
		languageDetected?: LanguageCode
		additionalContext?: Record<string, unknown>
	}>({
		reducer: (prev, next) => ({ ...prev, ...next }),
		default: () => ({}),
	}),

	// The agent node that last performed work or should act next
	next: Annotation<string>({
		reducer: (x, y) => y ?? x ?? END,
		default: () => END,
	}),

	error: Annotation<string | null>({
		reducer: (_prev, next) => next,
		default: () => null,
	}),
})
export type SupervisorState = typeof SupervisorAnnotation.State
export type SupervisorUpdate = typeof SupervisorAnnotation.Update
