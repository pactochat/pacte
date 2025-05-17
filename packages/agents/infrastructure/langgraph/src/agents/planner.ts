import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { RunnableConfig } from '@langchain/core/runnables'
import type { ChatOpenAI } from '@langchain/openai'

import type { PlanStep, PlannerOutput } from '@pacto-chat/agents-domain'
import type { WorkflowStateType } from '../state'
/**
 * Extract the goal from text if not explicitly provided
 */
function extractGoal(text: string): string {
	// Simple goal extraction - in a real implementation would use more sophisticated NLP
	const firstSentence = text.split(/[.!?][\s\n]/)[0] || ''

	if (firstSentence.length < 100) {
		return firstSentence
	}

	// If first sentence is too long, truncate
	return `${firstSentence.substring(0, 100)}...`
}

/**
 * Parse steps from LLM response
 */
async function parseSteps(
	content: string,
	model: ChatOpenAI,
): Promise<PlanStep[]> {
	// In a production system, use a structured output parser
	// Here we'll use a simple prompt to re-structure the output
	const prompt = ChatPromptTemplate.fromTemplate(`
    Parse the following plan into structured steps.
    For each step, extract:
    1. Step ID/number
    2. Title
    3. Description
    4. Time estimate (if available)
    5. Dependencies (if available)
    6. Resources needed (if available)
    7. Risks (if available)
    
    Plan content:
    {content}
    
    Output in a structured JSON format for each step.
  `)

	const chain = prompt.pipe(model)
	const response = await chain.invoke({ content })

	try {
		// Try to parse JSON response
		const parsedContent = messageContentToString(response.content)
		const jsonMatch = parsedContent.match(/```json\n([\s\S]*?)```|{[\s\S]*}/)
		const jsonString = jsonMatch?.[1] ?? jsonMatch?.[0] ?? '{}'
		const parsed = JSON.parse(jsonString.replace(/```/g, ''))

		// If the response is an array, use it directly
		if (Array.isArray(parsed)) {
			return parsed as PlanStep[]
		}

		// Otherwise, try to extract steps from the object
		if (parsed.steps && Array.isArray(parsed.steps)) {
			return parsed.steps as PlanStep[]
		}

		// Fallback: create steps from numbered properties
		const steps: PlanStep[] = []
		for (const key in parsed) {
			if (
				key.match(/step\d+|step_\d+|\d+/) &&
				typeof parsed[key] === 'object'
			) {
				steps.push({
					id: key,
					title: parsed[key].title || `Step ${key}`,
					description: parsed[key].description || '',
					timeEstimate: parsed[key].timeEstimate,
					dependencies: parsed[key].dependencies,
					resources: parsed[key].resources,
					risks: parsed[key].risks,
				})
			}
		}

		return steps
	} catch (error) {
		console.error('Failed to parse plan steps:', error)

		// Fallback - create basic steps by splitting content
		const sections = content
			.split(/Step \d+:|Phase \d+:|Stage \d+:|\n\d+\./)
			.filter(section => section.trim().length > 0)

		return sections.map((section, index) => {
			const lines = section.split('\n').filter(line => line.trim().length > 0)
			const title = lines[0]?.trim() ?? `Step ${index + 1}`
			const description = lines.slice(1).join('\n').trim()

			return {
				id: `Step ${index + 1}`,
				title,
				description,
				timeEstimate: extractTimeEstimate(section),
				dependencies: undefined,
				resources: undefined,
				risks: undefined,
			}
		})
	}
}

/**
 * Extract time estimate from text
 */
function extractTimeEstimate(text: string): string | undefined {
	const timePattern =
		/(?:time|duration|estimated time|timeframe):\s*([^.,\n]+)/i
	const match = text.match(timePattern)
	return match?.[1]?.trim()
}

/**
 * Parse additional plan details
 */
async function parsePlanDetails(
	content: string,
	steps: PlanStep[],
	model: ChatOpenAI,
): Promise<{
	totalTimeEstimate: string
	estimatedCompletion: string
	criticalPath: string[]
	keyRisks: string[]
	recommendations: string[]
}> {
	const prompt = ChatPromptTemplate.fromTemplate(`
    Extract the following details from this plan:
    
    1. Total time estimate for the entire plan
    2. Estimated completion date (if provided)
    3. Critical path steps
    4. Key risks or challenges
    5. Recommendations for implementation
    
    Plan content:
    {content}
    
    Output in JSON format with these five fields.
  `)

	const chain = prompt.pipe(model)
	const response = await chain.invoke({ content })

	try {
		// Try to parse JSON response
		const parsedContent = messageContentToString(response.content)
		const jsonMatch = parsedContent.match(/```json\n([\s\S]*?)```|{[\s\S]*}/)
		const jsonString = jsonMatch?.[1] ?? jsonMatch?.[0] ?? '{}'
		const parsed = JSON.parse(jsonString.replace(/```/g, ''))

		// Return the parsed data with defaults for missing fields
		return {
			totalTimeEstimate: parsed.totalTimeEstimate || calculateTotalTime(steps),
			estimatedCompletion:
				parsed.estimatedCompletion || estimateCompletion(steps),
			criticalPath: Array.isArray(parsed.criticalPath)
				? parsed.criticalPath
				: steps.map(s => s.id),
			keyRisks: Array.isArray(parsed.keyRisks)
				? parsed.keyRisks
				: extractRisks(content),
			recommendations: Array.isArray(parsed.recommendations)
				? parsed.recommendations
				: extractRecommendations(content),
		}
	} catch (error) {
		console.error('Failed to parse plan details:', error)

		// Fallback - extract information directly from content
		return {
			totalTimeEstimate: calculateTotalTime(steps),
			estimatedCompletion: estimateCompletion(steps),
			criticalPath: steps.map(s => s.id),
			keyRisks: extractRisks(content),
			recommendations: extractRecommendations(content),
		}
	}
}

/**
 * Calculate total time based on steps
 */
function calculateTotalTime(steps: PlanStep[]): string {
	const timeSteps = steps.filter(s => s.timeEstimate)

	if (timeSteps.length === 0) {
		return 'Not specified'
	}

	// Very simple estimation - in a real implementation would use proper time calculations
	return timeSteps.length === steps.length
		? 'Sum of all step durations'
		: 'Partially estimated based on available step durations'
}

/**
 * Estimate completion date
 */
function estimateCompletion(steps: PlanStep[]): string {
	// In a real implementation, would calculate based on dependencies and durations
	return 'Dependent on start date'
}

/**
 * Extract risks from plan content
 */
function extractRisks(content: string): string[] {
	// Look for risk section
	const riskSection = content.match(/risks?:.*?(?=\n\n|\n#|\n\*\*|$)/is)

	if (!riskSection) {
		return ['No specific risks identified']
	}

	// Split the risk section into bullet points
	return riskSection[0]
		.split(/\n-|\n\*|\n\d+\./)
		.slice(1) // Skip the header
		.map(s => s.trim())
		.filter(s => s.length > 0)
}

/**
 * Extract recommendations from plan content
 */
function extractRecommendations(content: string): string[] {
	// Look for recommendations section
	const recSection = content.match(/recommend.*?(?=\n\n|\n#|\n\*\*|$)/is)

	if (!recSection) {
		return ['No specific recommendations provided']
	}

	// Split the recommendations section into bullet points
	return recSection[0]
		.split(/\n-|\n\*|\n\d+\./)
		.slice(1) // Skip the header
		.map(s => s.trim())
		.filter(s => s.length > 0)
}

function messageContentToString(content: unknown): string {
	if (typeof content === 'string') return content
	if (Array.isArray(content)) {
		return content
			.map(c => {
				if (typeof c === 'string') return c
				if (
					typeof c === 'object' &&
					c &&
					'text' in c &&
					typeof c.text === 'string'
				)
					return c.text
				return ''
			})
			.join('')
	}
	return ''
}

export const createPlannerAgent = () => {
	return async (
		state: WorkflowStateType,
		config?: RunnableConfig,
	): Promise<Partial<WorkflowStateType>> => {
		try {
			// Use the input to simulate a plan
			const input = state.input

			const output: PlannerOutput = {
				text: `Plan for: ${input.intent.substring(0, 40)}...`,
				goal: input.intent.substring(0, 40),
				steps: [
					{
						id: 'step-1',
						title: 'First step',
						description: 'Do the first thing.',
					},
					{
						id: 'step-2',
						title: 'Second step',
						description: 'Do the second thing.',
					},
				],
				totalTimeEstimate: '2 days',
				estimatedCompletion: 'In 2 days',
				criticalPath: ['step-1', 'step-2'],
				keyRisks: ['Risk 1', 'Risk 2'],
				recommendations: ['Recommendation 1', 'Recommendation 2'],
				language: input.language,
			}

			return {
				planner: output,
				currentStep: 'rephraser',
			}
		} catch (error) {
			return {
				error:
					error instanceof Error ? error.message : 'Unknown error in planner',
				currentStep: 'end',
			}
		}
	}
}
