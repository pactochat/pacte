import { Context, Effect, Layer } from 'effect'

import type {
	SummarizerInput,
	SummarizerOutput,
} from '@pacto-chat/agents-domain'
import { summarizerNode } from '../agents/old_summarizer'
import type { AgentProcessingError } from './errors'
import { ModelService } from './model'
import { createGraphNode } from './utils'

export class SummarizerService extends Context.Tag('SummarizerService')<
	SummarizerService,
	{
		process: (
			input: SummarizerInput,
		) => Effect.Effect<SummarizerOutput, AgentProcessingError>
	}
>() {
	static readonly Live = Layer.effect(
		SummarizerService,
		Effect.gen(function* () {
			const model = yield* ModelService

			const process = (input: SummarizerInput) =>
				createGraphNode<SummarizerInput, SummarizerOutput>(
					'summarizer',
					async state => await summarizerNode(state, model),
					input,
				)

			return { process }
		}),
	)
}
