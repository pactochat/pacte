import type { FeatureExtractionOutput } from '@huggingface/inference'
import { Embeddings } from '@langchain/core/embeddings'
import { OpenAIEmbeddings } from '@langchain/openai'

import { ListLanguageCodes } from '@aipacto/shared-domain'
import { logAgentsInfraLangchain } from '@aipacto/shared-utils-logging'
import { huggingFaceClient } from '../tools/huggingface'
import { detectLanguage } from '../tools/language_detector'

/**
 * RoBERTa-ca embeddings class for LangChain
 * Uses Hugging Face Inference API to get embeddings from RoBERTa-ca model
 */
export class RoBERTaCaEmbeddings extends Embeddings {
	private modelId: string

	constructor(modelId = 'BSC-LT/RoBERTa-ca', params: any = {}) {
		super(params)
		this.modelId = modelId
	}

	/**
	 * Embeds a single text
	 * @param text The text to embed
	 * @returns The embeddings for the text
	 */
	async embedQuery(text: string): Promise<number[]> {
		try {
			logAgentsInfraLangchain.debug('Embedding query with RoBERTa-ca', { text })

			const response = await huggingFaceClient.featureExtraction({
				model: this.modelId,
				inputs: text,
			})

			return RoBERTaCaEmbeddings.extractEmbeddingVector(response)
		} catch (error) {
			logAgentsInfraLangchain.error('Error embedding query with RoBERTa-ca', {
				error,
			})
			throw error
		}
	}

	/**
	 * Embeds multiple documents
	 * @param documents List of documents to embed
	 * @returns The embeddings for each document
	 */
	async embedDocuments(documents: string[]): Promise<number[][]> {
		try {
			logAgentsInfraLangchain.debug('Embedding documents with RoBERTa-ca', {
				documentCount: documents.length,
			})

			// Process documents in batches to avoid overloading the API
			const batchSize = 5
			const embeddings: number[][] = []

			for (let i = 0; i < documents.length; i += batchSize) {
				const batch = documents.slice(i, i + batchSize)
				const batchPromises = batch.map(doc => this.embedQuery(doc))
				const batchResults = await Promise.all(batchPromises)

				embeddings.push(...batchResults)
			}

			return embeddings
		} catch (error) {
			logAgentsInfraLangchain.error(
				'Error embedding documents with RoBERTa-ca',
				{ error },
			)
			throw error
		}
	}

	static extractEmbeddingVector(response: FeatureExtractionOutput): number[] {
		if (Array.isArray(response)) {
			// If it's empty, return []
			if (response.length === 0) return []
			// If first element is a number, this is our embedding vector
			if (typeof response[0] === 'number') {
				return response as number[]
			}
			// If first element is an array (number[] or deeper)
			if (Array.isArray(response[0])) {
				// Take the first row, flatten if needed
				const firstRow = response[0] as any
				if (typeof firstRow[0] === 'number') {
					return firstRow as number[]
				}
				// Rare: If another level deep, flatten
				if (Array.isArray(firstRow[0])) {
					return firstRow[0] as number[] // at this point, you're probably in model weirdness
				}
			}
		}
		// Fallback: wrap as array if it's a number
		if (typeof response === 'number') {
			return [response]
		}
		throw new Error(
			`Unknown embedding output shape: ${JSON.stringify(response)}`,
		)
	}
}

/**
 * Language-aware embeddings class that uses RoBERTa-ca for Catalan content
 * and falls back to OpenAI embeddings for other languages
 */
export class LanguageAwareEmbeddings extends Embeddings {
	private robertaCaEmbeddings: RoBERTaCaEmbeddings
	private openAIEmbeddings: OpenAIEmbeddings

	constructor(modelId = 'BSC-LT/RoBERTa-ca', params: any = {}) {
		super(params)
		this.robertaCaEmbeddings = new RoBERTaCaEmbeddings(modelId, params)
		this.openAIEmbeddings = new OpenAIEmbeddings(params)
	}

	/**
	 * Embeds a single text, choosing embedding model based on detected language
	 * @param text The text to embed
	 * @returns The embeddings for the text
	 */
	async embedQuery(text: string): Promise<number[]> {
		try {
			// Detect language to determine which embedding model to use
			const language = await detectLanguage(text)
			logAgentsInfraLangchain.debug('Detected language for embedding', {
				language,
				textSample: text.slice(0, 50),
			})

			// Use RoBERTa-ca for Catalan text
			if (language === ListLanguageCodes.cat) {
				logAgentsInfraLangchain.debug('Using RoBERTa-ca for Catalan text')

				try {
					return await this.robertaCaEmbeddings.embedQuery(text)
				} catch (error) {
					logAgentsInfraLangchain.error(
						'Error with RoBERTa-ca, falling back to OpenAI',
						{ error },
					)
					return this.openAIEmbeddings.embedQuery(text)
				}
			} else {
				// For non-Catalan text, use OpenAI embeddings
				logAgentsInfraLangchain.debug(
					'Using OpenAI embeddings for non-Catalan text',
				)
				return this.openAIEmbeddings.embedQuery(text)
			}
		} catch (error) {
			logAgentsInfraLangchain.error('Error in language-aware embedding', {
				error,
			})
			// Fallback to OpenAI embeddings on error
			return this.openAIEmbeddings.embedQuery(text)
		}
	}

	/**
	 * Embeds multiple documents, choosing embedding model based on detected language
	 * @param documents List of documents to embed
	 * @returns The embeddings for each document
	 */
	async embedDocuments(documents: string[]): Promise<number[][]> {
		try {
			logAgentsInfraLangchain.debug('Embedding multiple documents', {
				count: documents.length,
			})

			// Process documents in batches
			const embeddings: number[][] = []

			for (const document of documents) {
				// Use embedQuery for each document to leverage language detection
				const embedding = await this.embedQuery(document)
				embeddings.push(embedding)
			}

			return embeddings
		} catch (error) {
			logAgentsInfraLangchain.error('Error embedding documents', { error })
			// Fallback to OpenAI embeddings on error
			return this.openAIEmbeddings.embedDocuments(documents)
		}
	}
}

// Singleton instances
export const robertaCaEmbeddings = new RoBERTaCaEmbeddings()
export const languageAwareEmbeddings = new LanguageAwareEmbeddings()
