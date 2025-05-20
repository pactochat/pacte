import { Annotation, MessagesAnnotation } from '@langchain/langgraph'

import type { SimplifierOutput } from '@pacto-chat/agents-domain'
import type { LanguageCode } from '@pacto-chat/shared-domain'

export const SimplifierAgentState = Annotation.Root({
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

	// Output of the simplification
	simplifier: Annotation<SimplifierOutput | undefined>({
		reducer: (prev, next) => next ?? prev,
		default: () => undefined,
	}),

	// Error handling
	error: Annotation<string | null>({
		reducer: (_prev, next) => next,
		default: () => null,
	}),
})

export type SimplifierAgentStateType = typeof SimplifierAgentState.State
