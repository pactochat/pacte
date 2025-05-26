import { InferenceClient } from '@huggingface/inference'

import { logAgentsInfraLangchain } from '@aipacto/shared-utils-logging'

/**
 * The Hugging Face Inference client
 */
export function createHuggingFaceClient(): InferenceClient {
	const accessToken = process.env.HUGGING_FACE_API_KEY

	if (!accessToken) {
		throw new Error('HUGGING_FACE_API_KEY environment variable is required')
	}

	const endpointUrl = process.env.EMBEDDING_HOST

	if (endpointUrl) {
		logAgentsInfraLangchain.debug(
			'Using custom Hugging Face Inference Endpoint',
			{ endpointUrl },
		)
		return new InferenceClient(accessToken, { endpointUrl })
	}

	return new InferenceClient(accessToken)
}

// Singleton instance
export const huggingFaceClient = createHuggingFaceClient()
