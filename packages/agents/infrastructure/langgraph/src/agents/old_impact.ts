import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { RunnableConfig } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'

import type { ImpactDimension, ImpactOutput } from '@pacto-chat/agents-domain'
import type { WorkflowStateType } from '../old_state'

// Create a schema for impact dimensions
const impactDimensionSchema = z.object({
	type: z.enum([
		'social',
		'financial',
		'environmental',
		'legal',
		'technological',
	]),
	score: z.number().min(1).max(10),
	explanation: z.string(),
})

// Create a schema for the full impact analysis output
const impactAnalysisSchema = z.object({
	dimensions: z.array(impactDimensionSchema),
	overallImpact: z.number().min(1).max(10),
	summary: z.string(),
})

// Create a parser for structured output
const parser = StructuredOutputParser.fromZodSchema(impactAnalysisSchema)

// Create the prompt template
const IMPACT_PROMPT = ChatPromptTemplate.fromTemplate(`
You are a specialized impact analysis agent.
Analyze the following text and determine its potential impact across different dimensions.

TEXT: {text}

Instructions:
- Evaluate the impact on: social, financial, environmental, legal, and technological dimensions
- Score each dimension from 1-10 (1 = very negative, 5 = neutral, 10 = very positive)
- Provide a brief explanation for each score
- Calculate an overall impact score (1-10)
- Provide a summary of the overall impact
- Respond in the language: {language}

${parser.getFormatInstructions()}
`)

export const createImpactAgent = () => {
	// Initialize the LLM
	const llm = new ChatOpenAI({
		modelName: 'gpt-4o',
		temperature: 0.2,
	})

	// Create the chain
	const impactChain = IMPACT_PROMPT.pipe(llm).pipe(parser)

	return async (
		state: WorkflowStateType,
		config?: RunnableConfig,
	): Promise<Partial<WorkflowStateType>> => {
		try {
			// Use the summarizer output as input for impact analysis
			if (!state.summarizer) {
				throw new Error('Summarizer output is required for impact analysis')
			}

			// Call the LLM to generate the impact analysis
			const impactAnalysis = await impactChain.invoke(
				{
					text: state.summarizer.text,
					language: state.input.language || 'en',
				},
				config,
			)

			// Format the output
			const output: ImpactOutput = {
				text: `Impact analysis: ${impactAnalysis.summary}`,
				impacts: impactAnalysis.dimensions as unknown as ImpactDimension[],
				overallImpact: impactAnalysis.overallImpact,
				summary: impactAnalysis.summary,
				language: state.input.language,
			}

			return {
				impact: output,
				currentStep: 'simplifier',
			}
		} catch (error) {
			return {
				error:
					error instanceof Error
						? error.message
						: 'Unknown error in impact analysis',
				currentStep: 'end',
			}
		}
	}
}
