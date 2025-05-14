import { type BaseMessage, HumanMessage } from '@langchain/core/messages'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { ChatOpenAI } from '@langchain/openai'

import type {
	ImpactDimension,
	ImpactDimensionType,
	ImpactInput,
	ImpactOutput,
} from '@pacto-chat/agents-domain'
import { type ZonedDateTimeString, nowZoned } from '@pacto-chat/shared-domain'
import type { BaseGraphState } from '../old_state'
import { logAgentExecution, messageContentToString } from './utils'

/**
 * Implementation of the impact assessment node for LangGraph
 */
export async function impactNode(
	state: BaseGraphState,
	model: ChatOpenAI,
): Promise<Partial<BaseGraphState>> {
	try {
		// Log the execution start
		const startLog = logAgentExecution('impact', 'started')

		// Get input from state
		const input = state.input as ImpactInput
		const dimensions =
			input.dimensions ||
			([
				'social',
				'financial',
				'environmental',
				'legal',
				'ethical',
			] as ImpactDimensionType[])
		const context = input.context || ''
		const includeRecommendations = input.includeRecommendations ?? true

		// Create prompt
		const prompt = ChatPromptTemplate.fromTemplate(`
      You are an expert impact assessor. Analyze the following text to determine its potential impact across multiple dimensions.
      
      For each dimension, provide:
      1. An impact score from -10 (very negative) to +10 (very positive)
      2. A brief explanation of your assessment
      3. Key factors that influenced your scoring
      4. Your confidence level (0-1) in this assessment
      
      Dimensions to assess: {dimensions}
      
      Additional context to consider: {context}
      
      Text to analyze:
      {text}
      
      Include recommendations for mitigating negative impacts: {includeRecommendations}
      
      Present your analysis in a structured format for each dimension.
    `)

		// Create chain
		const chain = prompt.pipe(model)

		// Log messages for tracing
		const messages: BaseMessage[] = [
			new HumanMessage(
				`Assess the impact of the following text: "${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}"`,
			),
		]

		// Execute the chain
		const response = await chain.invoke({
			text: input.text,
			dimensions: dimensions.join(', '),
			context,
			includeRecommendations,
		})

		// Add response to messages
		messages.push(response)

		// Parse the response to extract structured impact information
		// In a real implementation, we would use a structured output parser
		// For this example, we'll simulate parsing with placeholder data
		const impactDimensions = await parseImpactDimensions(
			[...dimensions], // Convert readonly array to mutable array
			response.content as string,
			model,
		)

		// Calculate overall impact (average of all dimension scores)
		const overallImpact =
			impactDimensions.reduce((sum, dim) => sum + dim.score, 0) /
			impactDimensions.length

		// Generate impact summary
		const summary = await generateImpactSummary(
			impactDimensions,
			overallImpact,
			model,
		)

		// Generate recommendations if requested
		let recommendations: string[] = []
		if (includeRecommendations) {
			recommendations = await generateRecommendations(impactDimensions, model)
		}

		// Create the output
		const output: ImpactOutput = {
			text: summary,
			impacts: impactDimensions,
			overallImpact: Math.round(overallImpact * 10) / 10,
			summary,
			recommendations: includeRecommendations ? recommendations : undefined,
			language: input.language,
			timestamp: nowZoned().toString() as ZonedDateTimeString,
		}

		// Log completion
		const completeLog = logAgentExecution('impact', 'completed')

		// Return updated state
		return {
			output,
			agentOutputs: { impact: output },
			messages,
			executionLog: [startLog, completeLog],
		}
	} catch (error) {
		// Log error
		const errorLog = logAgentExecution('impact', 'failed')

		// Return error state
		return {
			error: `Error in impact assessment: ${error}`,
			executionLog: [errorLog],
		}
	}
}

/**
 * Parse impact dimensions from LLM response
 */
async function parseImpactDimensions(
	dimensions: ImpactDimensionType[],
	content: string,
	model: ChatOpenAI,
): Promise<ImpactDimension[]> {
	// In a production system, use a structured output parser
	// Here we'll use a simple prompt to re-structure the output
	const prompt = ChatPromptTemplate.fromTemplate(`
    Parse the following impact assessment into a structured format.
    For each dimension, extract:
    1. The impact score (number from -10 to +10)
    2. The explanation
    3. Key factors (as a list)
    4. Confidence level (number from 0 to 1)
    
    Dimensions to extract: {dimensions}
    
    Assessment content:
    {content}
    
    Output in a structured JSON format for each dimension.
  `)

	const chain = prompt.pipe(model)
	const response = await chain.invoke({
		dimensions: dimensions.join(', '),
		content,
	})

	try {
		// Try to parse JSON response
		const parsedContent = messageContentToString(response.content)
		const jsonMatch = parsedContent.match(/```json\n([\s\S]*?)```|{[\s\S]*}/)
		const jsonString = jsonMatch?.[1] ?? jsonMatch?.[0] ?? '{}'
		const parsed = JSON.parse(jsonString.replace(/```/g, ''))

		// If the response is an array, use it directly
		if (Array.isArray(parsed)) {
			return parsed as ImpactDimension[]
		}

		// Otherwise, try to extract dimensions from the object
		return dimensions.map(dim => ({
			type: dim,
			score: parsed[dim]?.score || 0,
			explanation:
				parsed[dim]?.explanation || `No explanation for ${dim} impact`,
			keyFactors: parsed[dim]?.keyFactors || [],
			confidence: parsed[dim]?.confidence || 0.5,
		}))
	} catch (error) {
		// Fallback if parsing fails
		console.error('Failed to parse impact dimensions:', error)
		return dimensions.map(dim => ({
			type: dim,
			score: 0,
			explanation: `Failed to parse ${dim} impact assessment`,
			keyFactors: [],
			confidence: 0.5,
		}))
	}
}

/**
 * Generate a summary of the impact assessment
 */
async function generateImpactSummary(
	impacts: ImpactDimension[],
	overallScore: number,
	model: ChatOpenAI,
): Promise<string> {
	const prompt = ChatPromptTemplate.fromTemplate(`
    Create a concise summary (about 150 words) of the following impact assessment.
    
    Overall impact score: {overallScore}
    
    Impact dimensions:
    {impacts}
    
    Focus on the most significant positive and negative impacts,
    and provide a balanced assessment of the overall implications.
  `)

	const impactsText = impacts
		.map(imp => `${imp.type}: ${imp.score} - ${imp.explanation}`)
		.join('\n\n')

	const chain = prompt.pipe(model)
	const response = await chain.invoke({
		overallScore,
		impacts: impactsText,
	})

	return response.content as string
}

/**
 * Generate recommendations for mitigating negative impacts
 */
async function generateRecommendations(
	impacts: ImpactDimension[],
	model: ChatOpenAI,
): Promise<string[]> {
	// Only generate recommendations for negative impacts
	const negativeImpacts = impacts.filter(imp => imp.score < 0)

	if (negativeImpacts.length === 0) {
		return [
			'No significant negative impacts identified that require mitigation.',
		]
	}

	const prompt = ChatPromptTemplate.fromTemplate(`
    Generate specific, actionable recommendations to mitigate the following negative impacts.
    For each impact dimension, provide 1-2 practical recommendations.
    
    Negative impacts:
    {negativeImpacts}
    
    Format each recommendation as a clear, actionable statement.
  `)

	const negativeImpactsText = negativeImpacts
		.map(imp => `${imp.type} (${imp.score}): ${imp.explanation}`)
		.join('\n\n')

	const chain = prompt.pipe(model)
	const response = await chain.invoke({
		negativeImpacts: negativeImpactsText,
	})

	// Parse recommendations into a list
	const content = response.content as string
	const recommendations = content
		.split(/\n+/)
		.filter(line => line.trim().length > 0)
		.map(line => line.replace(/^-\s*/, '').trim())
		.filter(line => line.length > 10) // Filter out short lines

	return recommendations
}
