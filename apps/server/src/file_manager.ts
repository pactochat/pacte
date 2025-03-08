import { FileInfo, FileVersion, type Language } from '@agentic/agents-domain'
import { currentIsoDateTimeString, uuid } from '@agentic/shared-domain'
import { GitManager } from '@agentic/shared-infra-git-manager'

export class FileManager {
	private files: Map<string, FileInfo> = new Map()

	createProject(userId: string, name: string, isPermanent: boolean) {
		const projectId = uuid()
		let giteaRepoUrl = null
		if (isPermanent) {
			giteaRepoUrl = GitManager.createGiteaRepo(userId, projectId)
		}
		this.db.insert('projects', {
			id: projectId,
			user_id: userId,
			name,
			is_permanent: isPermanent,
			gitea_repo_url,
		})
		return projectId
	}

	createFile(
		filename: string,
		language: Language,
		librarySet?: string,
	): string {
		const fileId = uuid()

		const file = FileInfo.make({
			id: fileId,
			createdAt: currentIsoDateTimeString(),
			updatedAt: undefined,
			fileId,
			filename,
			versions: [],
			librarySet,
			language,
		})
		this.files.set(fileId, file)
		return fileId
	}

	addVersion(fileId: string, content: string): string {
		const file = this.getFile(fileId)
		const versionId = uuid()
		const now = new Date().toISOString()
		const version = FileVersion.make({
			id: uuid(),
			createdAt: now,
			updatedAt: undefined,
			versionId,
			content,
			timestamp: Date.now(),
		})
		file.versions.push(version)
		return versionId
	}

	getFile(fileId: string): FileInfo {
		const file = this.files.get(fileId)
		if (!file) throw new Error(`File ${fileId} not found`)
		return file
	}

	// ... other methods ...
}
