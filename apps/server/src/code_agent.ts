import { LLMChain } from 'langchain/chains'
// src/codeAgent.ts
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { PromptTemplate } from 'langchain/prompts'

import type { FileInfo } from '@agentic/agents-domain'
import { GitManager } from '@agentic/shared-infra-git-manager'
import type { FileManager } from './file_manager.js'
import {
	createEphemeralPod,
	createEphemeralService,
	deletePod,
	deleteService,
	getPodLogs,
} from './k8s_manager.js'
import { ResourceManager } from './resource_manager.js'
import { autoFixCode } from './utils/auto_fix.js'

export class CodeAgent {
	private fileManager: FileManager
	private llm: ChatOpenAI

	constructor(fileManager: FileManager) {
		this.fileManager = fileManager
		this.llm = new ChatOpenAI({
			temperature: 0,
			openAIApiKey: process.env.OPENAI_API_KEY!,
		})
	}

	/**
	 * Generate code using LLM, store as a new version in the file manager.
	 */
	async generateCode(fileId: string, prompt: string): Promise<string> {
		const file = this.fileManager.getFile(fileId)
		const chain = new LLMChain({
			llm: this.llm,
			prompt: new PromptTemplate({
				template: `You are a coding assistant. Generate valid {language} code with the following request:
{userPrompt}`,
				inputVariables: ['language', 'userPrompt'],
			}),
		})

		const response = await chain.call({
			language: file.language,
			userPrompt: prompt,
		})

		const newCode = response.text.trim()
		const versionId = this.fileManager.addVersion(fileId, newCode)
		return versionId
	}

	/**
	 * Run code from the file’s latest version, with auto-fix logic if error arises.
	 */
	// apps/server/src/code_agent.ts
	async runCode(
		userId: string,
		projectId: string,
		fileId: string,
		isPermanent: boolean,
	) {
		if (isPermanent) {
			const repoUrl = await GitManager.createGiteaRepo(userId, projectId)
			// Clone repo in pod, commit changes, and push to Gitea
			const dir = '/code'
			await GitManager.initLocalGit(dir)
			// Add and commit code
			await GitManager.commitLocal(dir, 'Update code')
			await GitManager.pushToGitea(dir, repoUrl)
		} else {
			// Handle ephemeral case with local Git only
		}
	}

	async hostCode(
		userId: string,
		projectId: string,
		fileId: string,
		port = 3000,
		taskComplexity = 'medium',
		isPermanent = false,
	) {
		const file = this.fileManager.getFile(userId, projectId, fileId)
		const podName = await createEphemeralPod(
			file.language,
			this.getCommand(file.language, file.content),
			file.librarySet,
			settings,
			true,
		)
		const serviceName = await createEphemeralService(podName, port)
		if (isPermanent) {
			// Add to a persistent store (e.g., DB) to track
		}
		return { podName, serviceName }
	}

	async stopHosting(podName: string, serviceName: string) {
		await deleteService(serviceName)
		await deletePod(podName)
	}

	/**
	 * Utility: parse code to run from memory.
	 * For real usage, you'd store code in a container volume or configMap, not just "-c"/"-e".
	 */
	private getCommand(
		language: 'python' | 'typescript',
		code: string,
	): string[] {
		if (language === 'python') {
			return ['python', '-c', code]
		} else {
			// Must have TS environment with 'ts-node' installed
			return ['npx', 'ts-node', '-e', code]
		}
	}

	private isLikelyError(logs: string): boolean {
		// A naive approach: if logs contain 'Traceback' or 'Error' or 'Exception' we consider it a fail
		const errorKeywords = [
			'Traceback',
			'Error',
			'Exception',
			'ReferenceError',
			'SyntaxError',
		]
		return errorKeywords.some(k => logs.includes(k))
	}
}
