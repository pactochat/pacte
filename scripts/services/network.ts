import { parse } from 'https://deno.land/std@0.219.0/yaml/mod.ts'
import { green, red, yellow } from '@std/fmt/colors'
// network_utils.ts
import { join } from '@std/path'
import { services } from './types.ts'

interface NetworkConfig {
	external?: boolean
	name?: string
}

interface DockerCompose {
	networks?: Record<string, NetworkConfig | boolean>
}

export class NetworkManager {
	/**
	 * Extract networks from a docker-compose.yml file
	 */
	async getNetworksFromDockerCompose(
		servicePath: string,
	): Promise<{ name: string; external: boolean }[]> {
		try {
			const dockerComposePath = join(servicePath, 'docker-compose.yaml')
			const content = await Deno.readTextFile(dockerComposePath)
			const dockerCompose = parse(content) as DockerCompose

			if (!dockerCompose.networks) return []

			return Object.entries(dockerCompose.networks).map(
				([networkKey, config]) => {
					// Handle both forms: networks.mynetwork: true and networks.mynetwork: { external: true }
					if (typeof config === 'boolean') {
						return { name: networkKey, external: false }
					}

					// Get the explicit name if provided, otherwise use the key
					const networkName = config.name || networkKey

					return {
						name: networkName,
						external: config.external === true,
					}
				},
			)
		} catch (error) {
			console.error(
				`Error reading docker-compose file for ${servicePath}: ${error}`,
			)
			return []
		}
	}

	/**
	 * Get all networks from specified services
	 */
	async getAllNetworks(
		selectedServices?: (keyof typeof services)[],
	): Promise<{ name: string; external: boolean }[]> {
		const servicesToCheck =
			selectedServices || (Object.keys(services) as (keyof typeof services)[])

		const networkPromises = servicesToCheck.map(async service => {
			const servicePath = services[service]
			return await this.getNetworksFromDockerCompose(servicePath)
		})

		const networks = await Promise.all(networkPromises)

		// Flatten and deduplicate networks by name
		const uniqueNetworks = new Map<
			string,
			{ name: string; external: boolean }
		>()
		for (const network of networks.flat()) {
			uniqueNetworks.set(network.name, network)
		}

		return Array.from(uniqueNetworks.values())
	}

	/**
	 * Check if a network exists
	 */
	async networkExists(networkName: string): Promise<boolean> {
		const process = new Deno.Command('docker', {
			args: [
				'network',
				'ls',
				'--format',
				'{{.Name}}',
				'--filter',
				`name=${networkName}`,
			],
			stdout: 'piped',
		})

		const { code, stdout } = await process.output()
		const output = new TextDecoder().decode(stdout).trim()

		return code === 0 && output.includes(networkName)
	}

	/**
	 * Create a network if it doesn't exist
	 */
	async createNetworkIfNotExists(networkName: string): Promise<void> {
		const exists = await this.networkExists(networkName)

		if (exists) {
			console.log(`${yellow('Notice:')} Network ${networkName} already exists`)
			return
		}

		console.log(`Creating network ${networkName}...`)

		const process = new Deno.Command('docker', {
			args: ['network', 'create', networkName],
			stdout: 'piped',
			stderr: 'piped',
		})

		const { code, stdout, stderr } = await process.output()

		if (code === 0) {
			console.log(`${green('Successfully created network')} ${networkName}`)
			if (stdout.length > 0) console.log(new TextDecoder().decode(stdout))
		} else {
			console.error(`${red('Error creating network')} ${networkName}`)
			if (stderr.length > 0) console.error(new TextDecoder().decode(stderr))
			throw new Error(`Failed to create network ${networkName}`)
		}
	}

	/**
	 * Remove a network
	 */
	async removeNetwork(networkName: string): Promise<void> {
		const exists = await this.networkExists(networkName)

		if (!exists) {
			console.log(`${yellow('Notice:')} Network ${networkName} does not exist`)
			return
		}

		console.log(`Removing network ${networkName}...`)

		const process = new Deno.Command('docker', {
			args: ['network', 'rm', networkName],
			stdout: 'piped',
			stderr: 'piped',
		})

		const { code, stdout, stderr } = await process.output()

		if (code === 0) {
			console.log(`${green('Successfully removed network')} ${networkName}`)
			if (stdout.length > 0) console.log(new TextDecoder().decode(stdout))
		} else {
			const errorMessage = new TextDecoder().decode(stderr)
			console.error(
				`${red('Error removing network')} ${networkName}: ${errorMessage}`,
			)
			// Don't throw here so we can continue with other networks
		}
	}

	/**
	 * Setup all required networks for services
	 */
	async setupNetworks(
		selectedServices?: (keyof typeof services)[],
	): Promise<void> {
		console.log('Setting up required networks...')

		// Get all external networks from docker-compose files
		const networks = await this.getAllNetworks(selectedServices)
		const externalNetworks = networks.filter(n => n.external)

		if (externalNetworks.length === 0) {
			console.log('No external networks defined in docker-compose files')
			return
		}

		// Create each external network if it doesn't exist
		for (const network of externalNetworks) {
			await this.createNetworkIfNotExists(network.name)
		}

		console.log(green('Network setup completed'))
	}

	/**
	 * Clean up networks
	 */
	async cleanNetworks(
		selectedServices?: (keyof typeof services)[],
	): Promise<void> {
		console.log(green('Cleaning networks...'))

		const networks = await this.getAllNetworks(selectedServices)

		if (networks.length === 0) {
			console.log(yellow('No networks found for the services'))
			return
		}

		// Sort networks so external ones are removed last
		// (they might be dependencies for other networks)
		const sortedNetworks = [...networks].sort((a, b) => {
			if (a.external && !b.external) return 1
			if (!a.external && b.external) return -1
			return 0
		})

		let removedCount = 0
		for (const network of sortedNetworks) {
			try {
				await this.removeNetwork(network.name)
				removedCount++
			} catch (error) {
				console.error(`Failed to remove network ${network.name}: ${error}`)
				// Continue with other networks
			}
		}

		if (removedCount > 0) {
			console.log(green(`Successfully removed ${removedCount} networks`))
		} else {
			console.log(yellow('No networks were removed'))
		}
	}
}

// Export a singleton instance for easier use
export const networkManager = new NetworkManager()
