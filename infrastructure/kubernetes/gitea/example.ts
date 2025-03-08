// gitea-api.ts - Interface for AI Code Agents to interact with Gitea

import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import * as simpleGit from 'simple-git'

export interface GitRepository {
	name: string
	owner: string
	description?: string
	private: boolean
	autoInit: boolean
}

export class GiteaService {
	private baseUrl: string
	private token: string

	constructor(baseUrl: string, token: string) {
		this.baseUrl = baseUrl
		this.token = token
	}

	/**
	 * Create a new repository for a user project
	 */
	async createRepository(
		userId: string,
		projectId: string,
		isPrivate = true,
	): Promise<string> {
		try {
			const repoName = `project-${projectId}`
			const response = await axios.post(
				`${this.baseUrl}/api/v1/user/repos`,
				{
					name: repoName,
					description: `Auto-generated repository for project ${projectId}`,
					private: isPrivate,
					auto_init: true,
					readme: 'Default',
					gitignores: 'Node',
					license: 'MIT',
				},
				{
					headers: {
						Authorization: `token ${this.token}`,
						'Content-Type': 'application/json',
					},
				},
			)

			return response.data.clone_url
		} catch (error) {
			console.error('Failed to create repository:', error)
			throw error
		}
	}

	/**
	 * Clone a repository to a local directory in the container
	 */
	async cloneRepository(cloneUrl: string, localPath: string): Promise<void> {
		try {
			const git = simpleGit()
			await git.clone(cloneUrl, localPath)
			return
		} catch (error) {
			console.error('Failed to clone repository:', error)
			throw error
		}
	}

	/**
	 * Commit and push changes to a repository
	 */
	async commitAndPush(
		localPath: string,
		message: string,
		authorName = 'AI Code Agent',
		authorEmail = 'ai-agent@example.com',
	): Promise<void> {
		try {
			const git = simpleGit(localPath)

			// Configure author for this repo only
			await git.addConfig('user.name', authorName, false, 'local')
			await git.addConfig('user.email', authorEmail, false, 'local')

			// Add all changes
			await git.add('.')

			// Commit
			await git.commit(message)

			// Push
			await git.push('origin', 'main')

			return
		} catch (error) {
			console.error('Failed to commit and push changes:', error)
			throw error
		}
	}

	/**
	 * Create a new branch from main
	 */
	async createBranch(localPath: string, branchName: string): Promise<void> {
		try {
			const git = simpleGit(localPath)
			await git.checkoutLocalBranch(branchName)
			await git.push('origin', branchName, ['--set-upstream'])
			return
		} catch (error) {
			console.error('Failed to create branch:', error)
			throw error
		}
	}

	/**
	 * Create a pull request
	 */
	async createPullRequest(
		owner: string,
		repo: string,
		title: string,
		head: string,
		base = 'main',
		body = 'Pull request created by AI Code Agent',
	): Promise<void> {
		try {
			await axios.post(
				`${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls`,
				{
					title,
					head,
					base,
					body,
				},
				{
					headers: {
						Authorization: `token ${this.token}`,
						'Content-Type': 'application/json',
					},
				},
			)
			return
		} catch (error) {
			console.error('Failed to create pull request:', error)
			throw error
		}
	}

	/**
	 * Get repository information including latest commit
	 */
	async getRepositoryInfo(owner: string, repo: string): Promise<any> {
		try {
			const response = await axios.get(
				`${this.baseUrl}/api/v1/repos/${owner}/${repo}`,
				{
					headers: {
						Authorization: `token ${this.token}`,
					},
				},
			)
			return response.data
		} catch (error) {
			console.error('Failed to get repository info:', error)
			throw error
		}
	}

	/**
	 * Delete a repository (use with caution)
	 */
	async deleteRepository(owner: string, repo: string): Promise<void> {
		try {
			await axios.delete(`${this.baseUrl}/api/v1/repos/${owner}/${repo}`, {
				headers: {
					Authorization: `token ${this.token}`,
				},
			})
			return
		} catch (error) {
			console.error('Failed to delete repository:', error)
			throw error
		}
	}
}

// Example usage in your agentic platform
export async function setupProjectRepository(
	userId: string,
	projectId: string,
): Promise<string> {
	const giteaService = new GiteaService(
		'https://gitea.example.com',
		process.env.GITEA_API_TOKEN || '',
	)

	// Create repository
	const repoUrl = await giteaService.createRepository(userId, projectId)

	// Clone repository to temporary directory
	const localPath = path.join('/tmp', `${userId}-${projectId}`)
	await giteaService.cloneRepository(repoUrl, localPath)

	return localPath
}
