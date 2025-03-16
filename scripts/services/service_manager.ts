import { green, red, yellow } from '@std/fmt/colors'
import { join } from '@std/path'

import { networkManager } from './network.ts'
import { services } from './types.ts'

class ServiceManager {
	private static readonly HEALTH_CHECK_INTERVAL = 5000 // 5 seconds
	private static readonly HEALTH_CHECK_TIMEOUT = 75000 // 75 seconds

	// Start services in the order defined in the services object, ensuring each is healthy before the next
	async startServices(selectedServices?: (keyof typeof services)[]) {
		// Setup networks
		await networkManager.setupNetworks(selectedServices)

		const servicesToStart =
			selectedServices && selectedServices.length > 0
				? selectedServices.filter(s => s in services)
				: (Object.keys(services) as (keyof typeof services)[])

		const startedServices: string[] = [] // Track started services dynamically

		for (const service of Object.keys(services) as (keyof typeof services)[]) {
			if (servicesToStart.includes(service)) {
				await this.startService(service)
				startedServices.push(service)

				// Wait for all started services to be healthy before proceeding
				const containerNames = await this.getContainerNames(service)
				for (const containerName of containerNames) {
					await this.waitForHealthyService(containerName)
				}
			}
		}

		await this.checkAllServicesHealth()
	}

	private async startService(serviceName: keyof typeof services) {
		const directory = services[serviceName]

		// Check if service is already running (based on container name pattern)
		const isRunning = await this.isServiceRunning(`xiroi_${serviceName}`)
		if (isRunning) {
			console.log(
				`${yellow('Notice:')} ${serviceName} service is already running`,
			)
			return
		}

		console.log(`Starting ${serviceName} service...`)

		const process = new Deno.Command('docker', {
			args: [
				'compose',
				'-f',
				join(directory, 'docker-compose.yaml'),
				'up',
				'-d',
			],
			stdout: 'piped',
			stderr: 'piped',
		})

		const { code, stdout, stderr } = await process.output()

		if (code === 0) {
			console.log(`${green('Successfully started')} ${serviceName}`)
			if (stdout.length > 0) console.log(new TextDecoder().decode(stdout))
		} else {
			console.error(`${red('Error starting')} ${serviceName}`)
			if (stderr.length > 0) console.error(new TextDecoder().decode(stderr))
			throw new Error(`Failed to start ${serviceName}`)
		}
	}

	private async waitForHealthyService(containerName: string) {
		console.log(`Waiting for ${containerName} to be healthy...`)
		const startTime = Date.now()

		while (true) {
			const isHealthy = await this.checkServiceHealth(containerName)

			if (isHealthy) {
				console.log(`${green('✓')} ${containerName} is healthy`)
				return true
			}

			if (Date.now() - startTime > ServiceManager.HEALTH_CHECK_TIMEOUT) {
				throw new Error(
					`Timeout waiting for ${containerName} to become healthy`,
				)
			}

			console.log(
				`${yellow('?')} Waiting for ${containerName} to become healthy...`,
			)
			await new Promise(resolve =>
				setTimeout(resolve, ServiceManager.HEALTH_CHECK_INTERVAL),
			)
		}
	}

	private async checkServiceHealth(containerName: string): Promise<boolean> {
		const process = new Deno.Command('docker', {
			args: [
				'ps',
				'--format',
				'{{.Names}},{{.Status}}',
				'--filter',
				`name=${containerName}`,
			],
			stdout: 'piped',
		})

		const { code, stdout } = await process.output()
		if (code !== 0) return false

		const output = new TextDecoder().decode(stdout)
		return output.includes('healthy')
	}

	private async isServiceRunning(containerPrefix: string): Promise<boolean> {
		const process = new Deno.Command('docker', {
			args: [
				'ps',
				'--filter',
				`name=${containerPrefix}`,
				'--format',
				'{{.State}}',
			],
			stdout: 'piped',
		})

		const { code, stdout } = await process.output()
		const output = new TextDecoder().decode(stdout).trim()

		return code === 0 && output.includes('running')
	}

	private async getContainerNames(
		serviceName: keyof typeof services,
	): Promise<string[]> {
		const directory = services[serviceName]
		const process = new Deno.Command('docker', {
			args: [
				'compose',
				'-f',
				join(directory, 'docker-compose.yaml'),
				'ps',
				'--format',
				'{{.Name}}',
			],
			stdout: 'piped',
			stderr: 'piped',
		})

		const { code, stdout, stderr } = await process.output()
		if (code !== 0) {
			console.error(
				`${red('Error fetching container names for')} ${serviceName}`,
			)
			if (stderr.length > 0) console.error(new TextDecoder().decode(stderr))
			return []
		}

		const output = new TextDecoder().decode(stdout).trim()
		return output.split('\n').filter(name => name.length > 0)
	}

	private async checkAllServicesHealth() {
		console.log('Checking health of all services...')

		const process = new Deno.Command('docker', {
			args: ['ps', '--format', '{{.Names}},{{.Status}}'],
			stdout: 'piped',
		})

		const { code, stdout } = await process.output()

		if (code === 0) {
			const output = new TextDecoder().decode(stdout)
			const lines = output.trim().split('\n')

			for (const line of lines) {
				const [name, status] = line.split(',')

				if (status.includes('healthy')) {
					console.log(`${green('✓')} ${name} is healthy`)
				} else if (status.includes('unhealthy')) {
					console.log(`${red('✗')} ${name} is unhealthy`)
				} else {
					console.log(`${yellow('?')} ${name} health unknown (${status})`)
				}
			}
		}
	}
}

// Main execution
if (import.meta.main) {
	const manager = new ServiceManager()
	const args = Deno.args as (keyof typeof services)[]

	// Validate service names
	const invalidServices = args.filter(service => !(service in services))
	if (invalidServices.length > 0) {
		console.error(
			`${red('Error:')} Invalid service(s) specified: ${invalidServices.join(', ')}`,
		)
		Deno.exit(1)
	}

	try {
		await manager.startServices(args.length > 0 ? args : undefined)
	} catch (error) {
		if (error instanceof Error) {
			console.error(red('Error:'), error.message)
		} else {
			console.error(red('Error:'), error)
		}
		Deno.exit(1)
	}
}
