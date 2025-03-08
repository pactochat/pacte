import type { ChatOpenAI } from 'langchain/chat_models/openai'

import { generateDiff } from './diff.js'

export async function autoFixCode(
	llm: ChatOpenAI,
	originalCode: string,
	errorMessage: string,
	language: 'python' | 'typescript',
	maxRetries = 5,
): Promise<string | null> {
	let currentCode = originalCode

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		// Create a custom LLM prompt analyzing the error
		const prompt = `
      You're a coding assistant. We have a snippet of ${language} code that threw an error:
      Error: ${errorMessage}
      Original code:
      ${currentCode}

      Please provide a revised code that fixes the error, if possible. Provide only code. No additional commentary.
    `
		const response = await llm.call([{ role: 'user', content: prompt }])
		const fixedCode = response.content.trim()

		if (fixedCode && fixedCode !== currentCode) {
			// Generate diff for reference (logging, etc.)
			const diff = generateDiff(currentCode, fixedCode)
			console.log(`Attempt #${attempt + 1}:\n`, diff)

			// Check if the new code is likely to compile or if it's empty
			if (fixedCode.length < 10) {
				// Something suspicious, skip
				continue
			}
			currentCode = fixedCode
			// In your real flow, you might test-run the code again.
			// If success, return fixedCode. If fail, loop.
			// For brevity, let's just return after first fix:
			return currentCode
		}
	}
	return null
}
