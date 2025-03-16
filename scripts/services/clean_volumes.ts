import { green, red } from '@std/fmt/colors'

import { networkManager } from './network.ts'
import { stopAllServices, stopSpecificServices } from './stop_services.ts'
import { services } from './types.ts'
import { getServiceVolumes, removeVolumes } from './volume_utils.ts'

// Function to clean volumes for all services
async function cleanAllVolumes() {
	console.log(green('Starting cleanup for all services...'))

	// Step 1: Stop all services
	await stopAllServices()

	// Step 2: Remove all volumes
	const volumesToRemove = await getServiceVolumes(
		Object.keys(services) as (keyof typeof services)[],
	)

	if (volumesToRemove.length > 0) {
		try {
			await removeVolumes(volumesToRemove)
			console.log(green('All service volumes removed successfully.'))
		} catch (error) {
			console.error(error instanceof Error ? error.message : 'Unknown error')
			Deno.exit(1)
		}
	} else {
		console.log(red('No volumes found for the services.'))
	}

	console.log(green('Cleanup for all services completed.'))
}

// Function to clean volumes for specific services
async function cleanSpecificVolume(
	selectedServices: (keyof typeof services)[],
) {
	console.log(
		green(
			`Starting cleanup for selected services: ${selectedServices.join(', ')}`,
		),
	)

	// Step 1: Stop specific services
	await stopSpecificServices(selectedServices)

	// Step 2: Remove volumes for the selected services
	const volumesToRemove = await getServiceVolumes(selectedServices)

	if (volumesToRemove.length > 0) {
		try {
			await removeVolumes(volumesToRemove)
			console.log(
				green(`Volumes removed for services: ${selectedServices.join(', ')}`),
			)
		} catch (error) {
			console.error(error instanceof Error ? error.message : 'Unknown error')
			Deno.exit(1)
		}
	} else {
		console.log(red('No volumes found for the specified services.'))
	}

	// Step 3: Clean up networks
	await networkManager.cleanNetworks()

	console.log(green('Cleanup for selected services completed.'))
}

/**
 * Usage:
 * - To clean all services: `deno run --allow-run --allow-read --allow-env clean_volumes.ts`
 * - To clean specific services by name (e.g., "sync" or "db"):
 *   `deno run --allow-run --allow-read --allow-env clean_volumes.ts sync db`
 */
if (import.meta.main) {
	const args = Deno.args as (keyof typeof services)[]

	// Validate service names
	const invalidServices = args.filter(service => !(service in services))

	if (invalidServices.length > 0) {
		console.error(
			`${red('Error:')} Invalid service(s) specified: ${invalidServices.join(', ')}`,
		)
		Deno.exit(1)
	}

	if (args.length > 0) await cleanSpecificVolume(args)
	else await cleanAllVolumes()
}
