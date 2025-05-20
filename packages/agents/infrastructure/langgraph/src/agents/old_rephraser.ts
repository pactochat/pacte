import type { RunnableConfig } from '@langchain/core/runnables'

import type { RephraserOutput } from '@pacto-chat/agents-domain'
import type { WorkflowStateType } from '../old_state'

export const createRephraserAgent = () => {
	return async (
		state: WorkflowStateType,
		config?: RunnableConfig,
	): Promise<Partial<WorkflowStateType>> => {
		try {
			if (!state.planner) {
				throw new Error('Planner output is required for rephraser')
			}

			const output: RephraserOutput = {
				text: `Rephrased: ${state.planner.text.substring(0, 40)}...`,
				originalText: state.planner.text,
				language: state.input.language,
			}

			return {
				// rephraser: output,
				currentStep: 'legalgap',
			}
		} catch (error) {
			return {
				error:
					error instanceof Error ? error.message : 'Unknown error in rephraser',
				currentStep: 'end',
			}
		}
	}
}
