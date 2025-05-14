import { Context, Effect, Layer } from 'effect'

import type {
	SimplifierInput,
	SimplifierOutput,
} from '@pacto-chat/agents-domain'
import { simplifierNode } from '../agents/simplifier'
import type { AgentProcessingError } from './errors'
import { ModelService } from './model'
import { createGraphNode } from './utils'

export class SimplifierService extends Context.Tag('SimplifierService')<
	SimplifierService,
	{
		process: (
			input: SimplifierInput,
		) => Effect.Effect<SimplifierOutput, AgentProcessingError>
	}
>() {
	static readonly Live = Layer.effect(
		SimplifierService,
		Effect.gen(function* () {
			const model = yield* ModelService

			const process = (input: SimplifierInput) =>
				createGraphNode<SimplifierInput, SimplifierOutput>(
					'simplifier',
					async state => await simplifierNode(state, model),
					input,
				)

			return { process }
		}),
	)
}
