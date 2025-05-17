import type { BaseMessage } from '@langchain/core/messages'
import { Annotation, messagesStateReducer } from '@langchain/langgraph'

import type {
	BaseAgentInput,
	BaseAgentOutput,
	ImpactOutput,
	PlannerOutput,
	SimplifierOutput,
	SummarizerOutput,
} from '@pacto-chat/agents-domain'

export const WorkflowState = Annotation.Root({
	// Agent outputs
	impact: Annotation<ImpactOutput>({
		reducer: (prev, next) => ({ ...prev, ...next }),
	}),
	// legalGap: Annotation<LegalGapOutput>({
	// 	reducer: (prev, next) => ({ ...prev, ...next }),
	// }),
	planner: Annotation<PlannerOutput>({
		reducer: (prev, next) => ({ ...prev, ...next }),
	}),
	simplifier: Annotation<SimplifierOutput>({
		reducer: (prev, next) => ({ ...prev, ...next }),
	}),
	summarizer: Annotation<SummarizerOutput>({
		reducer: (prev, next) => ({ ...prev, ...next }),
	}),

	// Workflow state
	input: Annotation<BaseAgentInput>({
		reducer: (prev, next) => ({ ...prev, ...next }),
	}),
	output: Annotation<BaseAgentOutput>({
		reducer: (prev, next) => ({ ...prev, ...next }),
	}),
	currentStep: Annotation<string>(),

	// All messages
	messages: Annotation<BaseMessage[]>({
		reducer: messagesStateReducer,
		default: () => [],
	}),

	// Error handling
	error: Annotation<string | null>({
		reducer: (_prev, next) => next,
		default: () => null,
	}),
})

export type WorkflowStateType = typeof WorkflowState.State
