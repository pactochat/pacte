import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { DynamicTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'

import {
	type LanguageCode,
	ListLanguageCodes,
	ListSupportedLanguagesCodes,
} from '@aipacto/shared-domain'
import { logAgentsInfraLangchain } from '@aipacto/shared-utils-logging'

/**
 * Tool for detecting the language of a text
 * Uses LLM for language detection based on supported languages from shared domain
 */
export const detectLanguageTool = new DynamicTool({
	name: 'detect_language',
	description:
		'Detect the language of a text from supported languages (Catalan, English, Spanish/Castilian).',
	func: async (text: string): Promise<LanguageCode> => {
		try {
			logAgentsInfraLangchain.debug('Detecting language', {
				textSample: text.slice(0, 100),
			})

			// Create a mapping of language names to codes for the prompt
			const languageOptions = {
				cat: 'Catalan',
				eng: 'English',
				spa: 'Spanish/Castilian',
			}

			// Format language options for the prompt
			const languagesList = Object.entries(languageOptions)
				.map(([code, name]) => `${name} (${code})`)
				.join(', ')

			// Create prompt for language detection
			const prompt = ChatPromptTemplate.fromTemplate(`
You're a language detector. Analyze the text and determine which language it's written in.
Only respond with ISO 639-3 three-letter language code.

Supported languages: ${languagesList}

Text to analyze:
"""
{text}
"""

Return only the three-letter language code (cat, eng, or spa).
      `)

			// Use a smaller model for efficiency
			const model = new ChatOpenAI({
				model: 'gpt-3.5-turbo',
				temperature: 0,
			})

			const chain = prompt.pipe(model).pipe(new StringOutputParser())
			const result = await chain.invoke({ text })

			// Extract and validate the language code
			const detectedCode = result.trim().toLowerCase()

			// Validate if it's a supported language
			if (detectedCode in ListSupportedLanguagesCodes) {
				logAgentsInfraLangchain.debug('Language detected', { detectedCode })
				return detectedCode as LanguageCode
			}

			// Default to Catalan if detection failed
			logAgentsInfraLangchain.warn(
				'Language detection failed, defaulting to Catalan',
				{ result },
			)
			return ListLanguageCodes.cat
		} catch (error) {
			logAgentsInfraLangchain.error('Error detecting language', { error })
			return ListLanguageCodes.cat
		}
	},
})

// /**
//  * Detect if text is in Catalan
//  * @param text Text to analyze
//  * @returns True if text is detected as Catalan
//  */
// export async function isCatalan(text: string): Promise<boolean> {
// 	try {
// 		const detectedLanguage = await detectLanguageTool.invoke(text)
// 		return detectedLanguage === 'cat'
// 	} catch (error) {
// 		logAgentsInfraLangchain.error('Error checking if text is Catalan', {
// 			error,
// 		})
// 		return false
// 	}
// }

/**
 * Detect language of text
 * @param text Text to analyze
 * @returns Detected language code
 */
export async function detectLanguage(text: string): Promise<LanguageCode> {
	return detectLanguageTool.invoke(text)
}
