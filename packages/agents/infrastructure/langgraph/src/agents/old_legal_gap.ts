import { type BaseMessage, HumanMessage } from '@langchain/core/messages'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { ChatOpenAI } from '@langchain/openai'

import type {
	LegalGap,
	LegalGapInput,
	LegalGapOutput,
	RiskLevel,
} from '@pacto-chat/agents-domain'
import { type ZonedDateTimeString, nowZoned } from '@pacto-chat/shared-domain'
import type { BaseGraphState } from '../state'
import { logAgentExecution, messageContentToString } from './utils'

/**
 * Implementation of the legal gap assessor node for LangGraph
 */
export async function legalGapNode(
	state: BaseGraphState,
	model: ChatOpenAI,
): Promise<Partial<BaseGraphState>> {
	try {
		// Log the execution start
		const startLog = logAgentExecution('legalGap', 'started')

		// Get input from state
		const input = state.input as LegalGapInput
		const jurisdiction = input.jurisdiction || 'United States'
		const industryContext = input.industryContext || 'General business'
		const focusAreas = input.focusAreas || []
		const includeDetailedCitations = input.includeDetailedCitations ?? false

		// Create prompt
		const prompt = ChatPromptTemplate.fromTemplate(`
      You are an expert legal compliance advisor. Assess the following text for potential legal gaps or issues 
      in the jurisdiction of {jurisdiction} specifically for the {industryContext} industry.
      
      For your assessment, focus on these legal areas: {focusAreas}.
      
      Include detailed legal citations: {includeDetailedCitations}
      
      For each legal gap or issue you identify, provide:
      1. A clear description of the issue
      2. The risk level (low, medium, high, or critical)
      3. Potential consequences if not addressed
      4. A recommendation to address this gap
      5. Relevant laws, regulations, or precedents
      6. Timeline recommendation for addressing this gap
      
      Also include:
      - An overall risk assessment summary
      - The highest risk level identified
      - A prioritized list of the gaps that need immediate attention
      - A clear legal disclaimer
      
      Text to assess:
      {text}
      
      Provide a comprehensive analysis focusing on actual legal gaps rather than general advice.
    `)

		// Create chain
		const chain = prompt.pipe(model)

		// Log messages for tracing
		const messages: BaseMessage[] = [
			new HumanMessage(
				`Assess legal gaps in '${jurisdiction}' for: "${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}"`,
			),
		]

		// Execute the chain
		const response = await chain.invoke({
			text: input.text,
			jurisdiction,
			industryContext,
			focusAreas:
				focusAreas.length > 0
					? focusAreas.join(', ')
					: 'all relevant legal areas',
			includeDetailedCitations,
		})

		// Add response to messages
		messages.push(response)

		// Parse gaps from the response
		const gaps = await parseGaps(response.content as string, model)

		// Determine highest risk level
		const highestRiskLevel = determineHighestRisk(gaps)

		// Create prioritized actions
		const prioritizedActions = createPrioritizedActions(gaps)

		// Extract overall risk assessment and disclaimer
		const { overallRiskAssessment, disclaimer } =
			await extractRiskAndDisclaimer(response.content as string, model)

		// Create the output
		const output: LegalGapOutput = {
			text: overallRiskAssessment,
			gaps,
			overallRiskAssessment,
			highestRiskLevel,
			prioritizedActions,
			disclaimer,
			jurisdiction,
			language: input.language,
			timestamp: nowZoned().toString() as ZonedDateTimeString,
		}

		// Log completion
		const completeLog = logAgentExecution('legalGap', 'completed')

		// Return updated state
		return {
			output,
			agentOutputs: { legalGap: output },
			messages,
			executionLog: [startLog, completeLog],
		}
	} catch (error) {
		// Log error
		const errorLog = logAgentExecution('legalGap', 'failed')

		// Return error state
		return {
			error: `Error in legal gap assessor: ${error}`,
			executionLog: [errorLog],
		}
	}
}

/**
 * Parse legal gaps from LLM response
 */
async function parseGaps(
	content: string,
	model: ChatOpenAI,
): Promise<LegalGap[]> {
	// In a production system, use a structured output parser
	// Here we'll use a simple prompt to re-structure the output
	const prompt = ChatPromptTemplate.fromTemplate(`
    Parse the following legal assessment into structured gap items.
    For each legal gap identified, extract:
    1. Issue description
    2. Risk level (low, medium, high, or critical)
    3. Consequences
    4. Recommendation
    5. Relevant laws (if available)
    6. Timeline to address (if available)
    
    Assessment content:
    {content}
    
    Output in a structured JSON format for each gap.
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
			return parsed.map(normalizeGap)
		}

		// Otherwise, try to extract gaps from the object
		if (parsed.gaps && Array.isArray(parsed.gaps)) {
			return parsed.gaps.map(normalizeGap)
		}

		// Fallback: create gaps from numbered properties
		const gaps: LegalGap[] = []
		for (const key in parsed) {
			if (key.match(/gap\d+|issue\d+|\d+/) && typeof parsed[key] === 'object') {
				gaps.push(normalizeGap(parsed[key]))
			}
		}

		return gaps
	} catch (error) {
		console.error('Failed to parse legal gaps:', error)

		// Fallback - extract gaps by looking for risk level indicators
		const riskPatterns = [
			/risk level:\s*(low|medium|high|critical)/i,
			/(low|medium|high|critical)\s*risk/i,
		]

		// Split content by sections that look like they might be gaps
		const sections = content
			.split(/\n\s*(?=\d+\.|\*|\-|\w+\s+Gap:|Issue\s*\d+:)/)
			.filter(section => {
				return (
					section.trim().length > 0 &&
					riskPatterns.some(pattern => pattern.test(section))
				)
			})

		return sections.map(section => {
			// Try to extract risk level
			let risk: RiskLevel = 'low' // Default
			for (const pattern of riskPatterns) {
				const match = section.match(pattern)
				const found = match?.[1]?.toLowerCase()
				if (found === 'low' || found === 'high') {
					risk = found as RiskLevel
					break
				}
			}

			// Extract issue description (first sentence or line)
			const splitSection = section?.split(/[.!?]|\n/)
			const issue =
				splitSection?.[0]?.trim() ?? 'Legal compliance gap identified'

			// Simple consequence extraction
			const consequenceMatch = section.match(/consequences?:?\s*([^.]*\.)/i)
			const consequences =
				consequenceMatch?.[1]?.trim() ??
				'Potential legal and regulatory issues.'

			// Simple recommendation extraction
			const recMatch = section.match(/recommend.*?:?\s*([^.]*\.)/i)
			const recommendation =
				recMatch?.[1]?.trim() ?? 'Consult with legal counsel.'

			return {
				issue,
				risk,
				consequences,
				recommendation,
				relevantLaws: undefined,
				timelineToAddress: undefined,
			}
		})
	}
}

/**
 * Normalize a legal gap object to ensure it has all required fields
 */
function normalizeGap(gap: Partial<LegalGap>): LegalGap {
	let risk: RiskLevel = 'low' // Default

	if (gap.risk) {
		const riskStr = gap.risk.toString().toLowerCase()

		if (riskStr === 'low' || riskStr === 'high') {
			risk = riskStr as RiskLevel
		}
	}

	return {
		issue: gap.issue || 'Legal compliance gap identified',
		risk,
		consequences: gap.consequences || 'Potential legal and regulatory issues.',
		recommendation: gap.recommendation || 'Consult with legal counsel.',
		relevantLaws: gap.relevantLaws,
		timelineToAddress: gap.timelineToAddress,
	}
}

/**
 * Determine the highest risk level from a list of gaps
 */
function determineHighestRisk(gaps: LegalGap[]): RiskLevel {
	const riskPriority: Record<RiskLevel, number> = {
		low: 1,
		high: 2,
	}

	let highestRisk: RiskLevel = 'low'

	for (const gap of gaps) {
		if (riskPriority[gap.risk] > riskPriority[highestRisk]) {
			highestRisk = gap.risk
		}
	}

	return highestRisk
}

/**
 * Create a list of prioritized actions based on gaps
 */
function createPrioritizedActions(gaps: LegalGap[]): string[] {
	// Sort gaps by risk level (high -> low)
	const riskPriority: Record<RiskLevel, number> = {
		high: 2,
		low: 1,
	}

	const sortedGaps = [...gaps].sort(
		(a, b) => riskPriority[b.risk] - riskPriority[a.risk],
	)

	// Create prioritized action items
	return sortedGaps.map(
		gap => `${gap.risk.toUpperCase()}: ${gap.recommendation}`,
	)
}

/**
 * Extract overall risk assessment and disclaimer from content
 */
async function extractRiskAndDisclaimer(
	content: string,
	model: ChatOpenAI,
): Promise<{ overallRiskAssessment: string; disclaimer: string }> {
	const prompt = ChatPromptTemplate.fromTemplate(`
    From the following legal assessment, extract:
    1. The overall risk assessment summary
    2. The legal disclaimer
    
    If either is not explicitly present, generate an appropriate one based on the content.
    
    Assessment content:
    {content}
    
    Output in JSON format with these two fields.
  `)

	const chain = prompt.pipe(model)
	const response = await chain.invoke({ content })

	try {
		// Try to parse JSON response
		const parsedContent = messageContentToString(response.content)
		const jsonMatch = parsedContent.match(/```json\n([\s\S]*?)```|{[\s\S]*}/)
		const jsonString = jsonMatch?.[1] ?? jsonMatch?.[0] ?? '{}'
		const parsed = JSON.parse(jsonString.replace(/```/g, ''))

		return {
			overallRiskAssessment:
				parsed.overallRiskAssessment || extractRiskAssessment(content),
			disclaimer: parsed.disclaimer || generateDisclaimer(),
		}
	} catch (error) {
		return {
			overallRiskAssessment: extractRiskAssessment(content),
			disclaimer: generateDisclaimer(),
		}
	}
}

/**
 * Extract risk assessment from content
 */
function extractRiskAssessment(content: string): string {
	// Look for risk assessment section
	const riskSection = content.match(
		/overall\s*risk\s*assessment.*?(?=\n\n|\n#|\n\*\*|$)/is,
	)

	if (riskSection) {
		return riskSection[0].trim()
	}

	// Fallback to summary section if present
	const summarySection = content.match(/summary.*?(?=\n\n|\n#|\n\*\*|$)/is)

	if (summarySection) {
		return summarySection[0].trim()
	}

	// Generic fallback
	return 'Legal gap assessment completed. Review identified issues and take appropriate actions.'
}

/**
 * Generate standard legal disclaimer
 */
function generateDisclaimer(): string {
	return 'DISCLAIMER: This assessment is for informational purposes only and does not constitute legal advice. The information provided is based on current understanding of relevant laws and regulations, which may change over time. Consult with qualified legal counsel before making decisions based on this assessment.'
}
