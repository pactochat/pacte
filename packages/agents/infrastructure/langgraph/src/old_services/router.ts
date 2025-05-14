import { Context, Effect, Layer } from 'effect'

import type { RouterInput, RouterOutput } from '@pacto-chat/agents-domain'
import { routerNode } from '../agents/router'
import type { AgentProcessingError } from './errors'
import { ModelService } from './model'
import { createGraphNode } from './utils'

export class RouterService extends Context.Tag('RouterService')<
	RouterService,
	{
		process: (
			input: RouterInput,
		) => Effect.Effect<RouterOutput, AgentProcessingError>
	}
>() {
	static readonly Live = Layer.effect(
		RouterService,
		Effect.gen(function* () {
			const model = yield* ModelService

			const process = (input: RouterInput) =>
				createGraphNode<RouterInput, RouterOutput>(
					'router',
					async state => await routerNode(state, model),
					input,
				)

			return { process }
		}),
	)
}
