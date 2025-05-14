import { ChatOpenAI } from '@langchain/openai'
import { Context, Layer } from 'effect'

/**
 * Model service for LLM access
 */
export class ModelService extends Context.Tag('ModelService')<
	ModelService,
	ChatOpenAI
>() {
	/**
	 * Create a layer with the default OpenAI model
	 *
	 * @param modelName The model name to use (defaults to gpt-4o)
	 * @param temperature The temperature to use (defaults to 0.1)
	 */
	static readonly Live = (modelName = 'gpt-4o', temperature = 0.1) =>
		Layer.succeed(ModelService, new ChatOpenAI({ modelName, temperature }))
}
