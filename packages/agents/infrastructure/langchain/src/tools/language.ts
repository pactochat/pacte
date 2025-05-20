import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { DynamicTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'

import { type LanguageCode, ListLanguageCodes } from '@pacto-chat/shared-domain'
import { logAgentsInfraLangchain } from '@pacto-chat/shared-utils-logging'
import { huggingFaceClient } from './huggingface'
import { detectLanguage } from './language_detector'

/**
 * Configuration for language-specific prompts and models
 */
interface LanguageConfig {
	/**
	 * Display name of the language
	 */
	name: string

	/**
	 * Specialized Hugging Face model for this language (if available)
	 */
	specializedModel?: string

	/**
	 * Query transformation prompt template for this language
	 */
	queryTransformPrompt: string

	/**
	 * Response generation prompt template for this language
	 */
	responsePrompt: string
}

/**
 * Language configuration map - add new languages here to support them in the application
 */
const LANGUAGE_CONFIG: Record<LanguageCode, LanguageConfig> = {
	cat: {
		name: 'Catalan',
		specializedModel: 'BSC-LT/RoBERTa-ca',
		queryTransformPrompt: `
Analitza aquesta pregunta en català i millora-la per a la cerca semàntica.
Aquí tens la pregunta original:
\n ------- \n
{question} 
\n ------- \n
Formula una pregunta millorada que capturi millor la intenció: `,
		responsePrompt: `
Ets un assistent municipal intel·ligent que ajuda als ciutadans amb la informació del seu ajuntament.
{context}
Utilitza només la informació proporcionada per respondre a la pregunta.
Si no pots respondre amb la informació proporcionada, digues honestament que no tens prou informació.

Context:
{context}

Pregunta: {question}

Resposta:`,
	},
	spa: {
		name: 'Spanish',
		queryTransformPrompt: `
Analiza esta pregunta en español y mejórala para la búsqueda semántica.
Aquí está la pregunta original:
\n ------- \n
{question} 
\n ------- \n
Formula una pregunta mejorada que capture mejor la intención: `,
		responsePrompt: `
Eres un asistente municipal inteligente que ayuda a los ciudadanos con información de su ayuntamiento.
{context}
Utiliza solo la información proporcionada para responder a la pregunta.
Si no puedes responder con la información proporcionada, di honestamente que no tienes suficiente información.

Contexto:
{context}

Pregunta: {question}

Respuesta:`,
	},
	eng: {
		name: 'English',
		queryTransformPrompt: `
Analyze this question in English and improve it for semantic search.
Here is the original question:
\n ------- \n
{question} 
\n ------- \n
Formulate an improved question that better captures the intent: `,
		responsePrompt: `
You are an intelligent municipal assistant that helps citizens with information about their city council.
{context}
Use only the information provided to answer the question.
If you cannot answer with the information provided, honestly state that you don't have enough information.

Context:
{context}

Question: {question}

Answer:`,
	},
}

/**
 * Get the configuration for a specific language
 * @param language Language code
 * @returns Language configuration or English config as fallback
 */
function getLanguageConfig(language: LanguageCode): LanguageConfig {
	return LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.eng
}

/**
 * Enhanced query transformation tool that adapts to the detected language
 */
export const transformQueryTool = new DynamicTool({
	name: 'transform_query',
	description:
		'Transform a query to optimize it for semantic search in any supported language',
	func: async (question: string) => {
		try {
			logAgentsInfraLangchain.debug('Transforming query', { question })

			// Detect language of the query
			const language = await detectLanguage(question)
			logAgentsInfraLangchain.debug(
				'Language detection for query transformation',
				{ language },
			)

			// Get language configuration
			const config = getLanguageConfig(language)

			// For Catalan, use specialized enhancement if RoBERTa-ca is available
			if (language === ListLanguageCodes.cat && config.specializedModel) {
				try {
					const enhancedQuery = await enhanceQueryWithSpecializedModel(
						question,
						language,
						config.specializedModel,
					)

					if (enhancedQuery) {
						return enhancedQuery
					}
					// If specialized enhancement fails, fallback to standard transformation
				} catch (error) {
					logAgentsInfraLangchain.error(
						'Error with specialized model enhancement, using standard transformation',
						{
							error,
							language,
						},
					)
				}
			}

			// Standard language-specific query transformation
			logAgentsInfraLangchain.debug('Using standard query transformation', {
				language,
			})

			const prompt = ChatPromptTemplate.fromTemplate(
				config.queryTransformPrompt,
			)
			const model = new ChatOpenAI({
				model: 'gpt-4o',
				temperature: 0,
			})

			const chain = prompt.pipe(model).pipe(new StringOutputParser())
			return chain.invoke({ question })
		} catch (error) {
			logAgentsInfraLangchain.error('Error transforming query', { error })
			// Return original question on error
			return question
		}
	},
})

/**
 * Enhance a query using a specialized language model (like RoBERTa-ca for Catalan)
 * @param question Original question
 * @param language Language code
 * @param modelId Model ID for specialized enhancement
 * @returns Enhanced question or null if enhancement fails
 */
async function enhanceQueryWithSpecializedModel(
	question: string,
	language: LanguageCode,
	modelId: string,
): Promise<string | null> {
	try {
		logAgentsInfraLangchain.debug(
			'Using specialized model for query enhancement',
			{ language, modelId },
		)

		// Different enhancement techniques depending on language and model capabilities

		// For Catalan with RoBERTa-ca
		if (language === ListLanguageCodes.cat && modelId === 'BSC-LT/RoBERTa-ca') {
			return enhanceCatalanQueryWithRobertaCa(question)
		}

		// Add more language-specific implementations here

		// Return null if no specialized implementation for this language/model
		return null
	} catch (error) {
		logAgentsInfraLangchain.error(
			'Error enhancing query with specialized model',
			{ error, language, modelId },
		)
		return null
	}
}

/**
 * Enhance a Catalan query using RoBERTa-ca capabilities
 * @param question Original question in Catalan
 * @returns Enhanced question for better search results
 */
async function enhanceCatalanQueryWithRobertaCa(
	question: string,
): Promise<string> {
	try {
		// Use AI to identify key terms and create a template for enhancement
		const llm = new ChatOpenAI({
			model: 'gpt-4o',
			temperature: 0,
		})

		const analyzePrompt = ChatPromptTemplate.fromTemplate(
			`Analitza aquesta pregunta en català i identifica els termes clau que podrien ser 
      expandits amb sinònims per millorar la cerca semàntica. 
      La teva resposta hauria de ser la mateixa pregunta amb la paraula "[MASK]" afegida 
      abans dels termes clau per poder expandir-los.
      
      Pregunta original: {question}
      
      Format exemple:
      Original: "Com puc sol·licitar una ajuda per la vivenda?"
      Resposta: "Com puc [MASK] sol·licitar una [MASK] ajuda per la [MASK] vivenda?"
      
      Resposta:`,
		)

		const maskedTemplate = await analyzePrompt
			.pipe(llm)
			.pipe(new StringOutputParser())
			.invoke({ question })

		// If no [MASK] tokens were added, return the original question
		if (!maskedTemplate.includes('[MASK]')) {
			return question
		}

		// Use the fillMask endpoint to expand key terms
		try {
			// For each [MASK] token, get predictions from RoBERTa-ca
			let enhancedQuestion = maskedTemplate
			const maskCount = (maskedTemplate.match(/\[MASK\]/g) || []).length

			for (let i = 0; i < maskCount; i++) {
				const currentTemplate = enhancedQuestion

				// Skip if no more masks
				if (!currentTemplate.includes('[MASK]')) break

				const predictions = await huggingFaceClient.fillMask({
					model: 'BSC-LT/RoBERTa-ca',
					inputs: currentTemplate,
				})

				// Get the best prediction
				if (predictions && predictions.length > 0) {
					// Replace the first [MASK] with the predicted word
					const prediction = predictions[0]
					if (prediction) {
						enhancedQuestion = prediction.sequence
					}
				}
			}

			// Use AI to create the final enhanced query
			const finalPrompt = ChatPromptTemplate.fromTemplate(
				`He utilitzat el model RoBERTa-ca per expandir els termes clau d'aquesta pregunta:
        
        Pregunta original: {original}
        Pregunta expandida: {expanded}
        
        Ara, crea una versió final optimitzada per a cerca semàntica que capturi millor la 
        intenció de la pregunta, incorporant els termes addicionals d'una manera natural.
        La teva resposta ha de ser només la pregunta optimitzada, sense cap explicació.`,
			)

			const finalQuestion = await finalPrompt
				.pipe(llm)
				.pipe(new StringOutputParser())
				.invoke({ original: question, expanded: enhancedQuestion })

			return finalQuestion.trim()
		} catch (error) {
			logAgentsInfraLangchain.error('Error using fillMask for Catalan query', {
				error,
			})
			return question
		}
	} catch (error) {
		logAgentsInfraLangchain.error('Error enhancing Catalan query', { error })
		return question
	}
}

/**
 * Get language-specific prompt for a response based on the detected language
 * @param language Detected language code
 * @param context Context about the task or domain
 * @returns Prompt template in the appropriate language
 */
export function getLanguageSpecificPrompt(
	language: LanguageCode,
	context = '',
): string {
	const config = getLanguageConfig(language)
	return config.responsePrompt.replace('{context}', context)
}

/**
 * Check if a language has a specialized model available
 * @param language Language code to check
 * @returns True if the language has a specialized model
 */
export function hasSpecializedModel(language: LanguageCode): boolean {
	const config = getLanguageConfig(language)
	return !!config.specializedModel
}

/**
 * Get the specialized model ID for a language if available
 * @param language Language code
 * @returns Specialized model ID or undefined
 */
export function getSpecializedModelId(
	language: LanguageCode,
): string | undefined {
	const config = getLanguageConfig(language)
	return config.specializedModel
}

/**
 * Get all supported languages with their configurations
 * @returns Record of language codes to their configurations
 */
export function getSupportedLanguages(): Record<
	LanguageCode,
	{ name: string; hasSpecializedModel: boolean }
> {
	const result: Record<string, { name: string; hasSpecializedModel: boolean }> =
		{}

	for (const [code, config] of Object.entries(LANGUAGE_CONFIG)) {
		result[code] = {
			name: config.name,
			hasSpecializedModel: !!config.specializedModel,
		}
	}

	return result as Record<
		LanguageCode,
		{ name: string; hasSpecializedModel: boolean }
	>
}
