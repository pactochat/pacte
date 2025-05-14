import { Layer } from 'effect'

import { ImpactService } from './impact'
import { LegalGapService } from './legal_gap'
import { ModelService } from './model'
import { PlannerService } from './planner'
import { RephraserService } from './rephraser'
import { RouterService } from './router'
import { SimplifierService } from './simplifier'
import { SummarizerService } from './summarizer'
import { WorkflowService } from './workflow'

export * from './errors'
export * from './utils'
export {
	ImpactService,
	LegalGapService,
	PlannerService,
	RephraserService,
	RouterService,
	SimplifierService,
	SummarizerService,
}

/**
 * Default Layer with all services configured
 *
 * @param modelName The LLM model name to use (defaults to gpt-4o)
 * @param temperature The temperature to use (defaults to 0.1)
 */
export const AllServicesLive = (modelName = 'gpt-4o', temperature = 0.1) =>
	Layer.mergeAll(
		ModelService.Live(modelName, temperature),
		ImpactService.Live,
		LegalGapService.Live,
		PlannerService.Live,
		RephraserService.Live,
		RouterService.Live,
		SimplifierService.Live,
		SummarizerService.Live,
		WorkflowService.Live,
	)
