import { Context, Effect, Layer } from 'effect'

import type { ImpactInput, ImpactOutput } from '@pacto-chat/agents-domain'
import { impactNode } from '../agents/old_impact'
import type { AgentProcessingError } from './errors'
import { ModelService } from './model'
import { createGraphNode } from './utils'

export class ImpactService extends Context.Tag('ImpactService')<
	ImpactService,
	{
		process: (
			input: ImpactInput,
		) => Effect.Effect<ImpactOutput, AgentProcessingError>
	}
>() {
	static readonly Live = Layer.effect(
		ImpactService,
		Effect.gen(function* () {
			const model = yield* ModelService

			const process = (input: ImpactInput) =>
				createGraphNode<ImpactInput, ImpactOutput>(
					'impact',
					async state => await impactNode(state, model),
					input,
				)

			return { process }
		}),
	)
}
