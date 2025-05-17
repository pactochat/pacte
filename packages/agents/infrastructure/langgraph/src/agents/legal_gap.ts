// import type { RunnableConfig } from '@langchain/core/runnables'

// import type { LegalGapOutput } from '@pacto-chat/agents-domain'
// import type { WorkflowStateType } from '../state'

// export const createLegalGapAgent = () => {
// 	return async (
// 		state: WorkflowStateType,
// 		config?: RunnableConfig,
// 	): Promise<Partial<WorkflowStateType>> => {
// 		try {
// 			if (!state.) {
// 				throw new Error('Rephraser output is required for legal gap analysis')
// 			}

// 			const output: LegalGapOutput = {
// 				text: `Legal gap analysis for: ${state.rephraser.text.substring(0, 40)}...`,
// 				gaps: [
// 					{
// 						issue: 'Missing compliance with regulation X',
// 						risk: 'high',
// 						consequences: 'Potential fine',
// 						recommendation: 'Update policy to comply',
// 					},
// 				],
// 				overallRiskAssessment: 'High risk due to missing compliance.',
// 				highestRiskLevel: 'high',
// 				prioritizedActions: ['Update policy to comply'],
// 				disclaimer: 'This is not legal advice.',
// 				jurisdiction: 'EU',
// 				language: state.input.language,
// 			}

// 			return {
// 				legalGap: output,
// 				currentStep: 'end',
// 			}
// 		} catch (error) {
// 			return {
// 				error:
// 					error instanceof Error
// 						? error.message
// 						: 'Unknown error in legal gap analysis',
// 				currentStep: 'end',
// 			}
// 		}
// 	}
// }
