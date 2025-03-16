import { join } from 'https://deno.land/std@0.219.0/path/mod.ts'
import { parse } from 'https://deno.land/std@0.219.0/yaml/mod.ts'
import { green, red } from '@std/fmt/colors'
import { services } from './types.ts'

interface DockerCompose {
	volumes?: Record<string, { name?: string }>
}

export async function getVolumeNamesFromDockerCompose(
	servicePath: string,
): Promise<string[]> {
	try {
		const dockerComposePath = join(servicePath, 'docker-compose.yaml')
		const content = await Deno.readTextFile(dockerComposePath)
		const dockerCompose = parse(content) as DockerCompose

		if (!dockerCompose.volumes) return []

		return Object.entries(dockerCompose.volumes)
			.map(([_, config]) => config.name)
			.filter((name): name is string => !!name)
	} catch (error) {
		console.error(
			`Error reading docker-compose file for ${servicePath}: ${error}`,
		)
		return []
	}
}

export async function getServiceVolumes(
	selectedServices: (keyof typeof services)[],
): Promise<string[]> {
	const volumePromises = selectedServices.map(async service => {
		const servicePath = services[service]
		return await getVolumeNamesFromDockerCompose(servicePath)
	})

	const volumes = await Promise.all(volumePromises)
	return volumes.flat()
}

export async function removeVolumes(volumes: string[]) {
	for (const volume of volumes) {
		console.log(`Removing volume ${volume}...`)
		const process = new Deno.Command('docker', {
			args: ['volume', 'rm', volume],
			stdout: 'piped',
			stderr: 'piped',
		})

		const { code, stderr } = await process.output()

		if (code === 0) {
			console.log(`${green('Successfully removed volume')} ${volume}`)
		} else {
			const errorMessage = new TextDecoder().decode(stderr)
			console.error(`${red('Error removing volume')} ${volume}`)
			if (errorMessage.length > 0) console.error(errorMessage)

			// Stop the process if volume removal fails
			throw new Error(`Failed to remove volume ${volume}: ${errorMessage}`)
		}
	}
}
