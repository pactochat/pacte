import { Context, Effect, Layer } from 'effect'

import type { LegalGapInput, LegalGapOutput } from '@pacto-chat/agents-domain'
import { legalGapNode } from '../agents/legal_gap'
import type { AgentProcessingError } from './errors'
import { ModelService } from './model'
import { createGraphNode } from './utils'

export class LegalGapService extends Context.Tag('LegalGapService')<
	LegalGapService,
	{
		process: (
			input: LegalGapInput,
		) => Effect.Effect<LegalGapOutput, AgentProcessingError>
	}
>() {
	static readonly Live = Layer.effect(
		LegalGapService,
		Effect.gen(function* () {
			const model = yield* ModelService

			const process = (input: LegalGapInput) =>
				createGraphNode<LegalGapInput, LegalGapOutput>(
					'legalGap',
					async state => await legalGapNode(state, model),
					input,
				)

			return { process }
		}),
	)
}
