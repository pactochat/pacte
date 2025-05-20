import { copyFile, mkdir } from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { boolean, command, run, string } from '@drizzle-team/brocli'
import { $ } from 'execa'

const CERT_PATHS = {
	source: {
		dir: 'certificates',
		key: 'localhost-key.pem',
		cert: 'localhost.pem',
	},
	destinations: ['services/authz/certificates'],
} as const

const setupOptions = {
	skipCerts: boolean().desc('Skip certificate generation').default(false),
	skipHosts: boolean().desc('Skip hosts file configuration').default(false),
	environment: string()
		.desc('Target environment')
		.enum('local', 'production')
		.default('local'),
}

const checkPrerequisites = async () => {
	const nodeVersion = process.version.slice(1)
	const { stdout: yarnVersion } = await $`yarn --version`

	const checkVersion = (current: string, required: string) => {
		const [curMajor] = current.split('.')
		const [reqMajor] = required.split('.')
		return Number.parseInt(curMajor) >= Number.parseInt(reqMajor)
	}

	if (!checkVersion(nodeVersion, '22.0.0')) {
		throw new Error('Node.js 22 or higher is required')
	}

	if (!checkVersion(yarnVersion, '4.6.0')) {
		throw new Error('Yarn 4.6.0 or higher is required')
	}
}

const setupCertificates = async () => {
	if (os.platform() !== 'darwin') {
		throw new Error('This setup script currently only supports macOS')
	}

	// Create main certificates directory
	await mkdir(CERT_PATHS.source.dir, { recursive: true })

	const sourcePath = CERT_PATHS.source.dir
	const keyPath = join(sourcePath, CERT_PATHS.source.key)
	const certPath = join(sourcePath, CERT_PATHS.source.cert)

	try {
		// Check if mkcert is installed
		await $({ stdio: 'ignore' })`brew list mkcert`
	} catch {
		console.log('📦 Installing mkcert...')
		await $`brew install mkcert && brew install nss`
	}

	console.log('🔐 Installing local CA...')
	await $`mkcert -install`

	console.log('🔑 Generating certificates...')
	await $`mkcert -key-file ${keyPath} -cert-file ${certPath} localhost web.pacto.local api.pacto.local`

	// Copy certificates to all required destinations
	console.log('📋 Copying certificates to services...')
	for (const destDir of CERT_PATHS.destinations) {
		await mkdir(destDir, { recursive: true })
		await copyFile(keyPath, join(destDir, CERT_PATHS.source.key))
		await copyFile(certPath, join(destDir, CERT_PATHS.source.cert))
	}

	console.log('✅ Certificates setup complete')
}

const setupCommand = command({
	name: 'development',
	desc: 'Set up Pacto Chat development environment',
	options: setupOptions,
	handler: async opts => {
		await checkPrerequisites()
		if (!opts.skipCerts) {
			await setupCertificates()
		}
	},
})

run([setupCommand], {
	name: 'aipacto',
	description: 'Pacto Chat development environment setup tool',
	version: '0.1.0',
})
