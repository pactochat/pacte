import type { SummarizerOutput } from '@aipacto/agents-domain'
import type { LanguageCode } from '@aipacto/shared-domain'
import { Annotation, MessagesAnnotation } from '@langchain/langgraph'

export const SummarizerAgentState = Annotation.Root({
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

	// Stores the text content retrieved from a vector store
	retrievedDocuments: Annotation<string | undefined>({
		reducer: (prev, next) => next ?? prev,
		default: () => undefined,
	}),

	// Output of the summarizer
	summarizer: Annotation<SummarizerOutput | undefined>({
		reducer: (prev, next) => next ?? prev, // Update if new value, keep prev if next is undefined
		default: () => undefined,
	}),

	// Error handling for this agent
	error: Annotation<string | null>({
		reducer: (_prev, next) => next,
		default: () => null,
	}),
})
export type SummarizerAgentStateType = typeof SummarizerAgentState.State
