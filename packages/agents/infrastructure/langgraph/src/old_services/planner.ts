import { Context, Effect, Layer } from 'effect'

import type { PlannerInput, PlannerOutput } from '@pacto-chat/agents-domain'
import { plannerNode } from '../agents/planner'
import type { AgentProcessingError } from './errors'
import { ModelService } from './model'
import { createGraphNode } from './utils'

export class PlannerService extends Context.Tag('PlannerService')<
	PlannerService,
	{
		process: (
			input: PlannerInput,
		) => Effect.Effect<PlannerOutput, AgentProcessingError>
	}
>() {
	static readonly Live = Layer.effect(
		PlannerService,
		Effect.gen(function* () {
			const model = yield* ModelService

			const process = (input: PlannerInput) =>
				createGraphNode<PlannerInput, PlannerOutput>(
					'planner',
					async state => await plannerNode(state, model),
					input,
				)

			return { process }
		}),
	)
}
