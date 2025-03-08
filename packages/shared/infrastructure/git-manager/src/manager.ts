import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { Effect } from 'effect'

const execAsync = promisify(exec)

export class GitManager {
	static initLocalGit(dir: string) {
		return Effect.tryPromise(() => execAsync('git init', { cwd: dir }))
	}

	static commitLocal(dir: string, message: string) {
		return Effect.tryPromise(() =>
			execAsync(`git add . && git commit -m "${message}"`, { cwd: dir }),
		)
	}

	static async createGiteaRepo(userId: string, projectId: string) {
		// Use Gitea API to create a repo (e.g., POST /api/v1/user/repos)
		const repoUrl = `http://gitea:3000/${userId}/${projectId}.git`
		// API call logic here
		return repoUrl
	}

	static async pushToGitea(dir: string, repoUrl: string) {
		return Effect.tryPromise(() =>
			execAsync(`git remote add origin ${repoUrl} && git push -u origin main`, {
				cwd: dir,
			}),
		)
	}
}
