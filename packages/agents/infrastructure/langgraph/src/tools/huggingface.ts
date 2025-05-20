import { InferenceClient } from '@huggingface/inference'

import { logAgentsInfraLangchain } from '@pacto-chat/shared-utils-logging'

/**
 * Create a Hugging Face Inference client
 * @returns Configured InferenceClient
 */
export function createHuggingFaceClient(): InferenceClient {
	const accessToken = process.env.HUGGING_FACE_API_KEY

	if (!accessToken) {
		throw new Error('HUGGING_FACE_API_KEY environment variable is required')
	}

	// For Inference Endpoints (if configured)
	const endpointUrl = process.env.ROBERTA_CA_ENDPOINT

	if (endpointUrl) {
		logAgentsInfraLangchain.debug(
			'Using custom Hugging Face Inference Endpoint',
			{ endpointUrl },
		)
		return new InferenceClient(accessToken, { endpointUrl })
	}

	// Standard Inference API
	return new InferenceClient(accessToken)
}

// Singleton instance
export const huggingFaceClient = createHuggingFaceClient()
