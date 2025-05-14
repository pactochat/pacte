import { Context, Effect, Layer } from 'effect'

import type { RephraserInput, RephraserOutput } from '@pacto-chat/agents-domain'
import { rephraserNode } from '../agents/rephraser'
import type { AgentProcessingError } from './errors'
import { ModelService } from './model'
import { createGraphNode } from './utils'

export class RephraserService extends Context.Tag('RephraserService')<
	RephraserService,
	{
		process: (
			input: RephraserInput,
		) => Effect.Effect<RephraserOutput, AgentProcessingError>
	}
>() {
	static readonly Live = Layer.effect(
		RephraserService,
		Effect.gen(function* () {
			const model = yield* ModelService

			const process = (input: RephraserInput) =>
				createGraphNode<RephraserInput, RephraserOutput>(
					'rephraser',
					async state => await rephraserNode(state, model),
					input,
				)

			return { process }
		}),
	)
}
