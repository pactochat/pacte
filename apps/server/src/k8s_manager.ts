import {
	CoreV1Api,
	KubeConfig,
	type V1Container,
	type V1Pod,
	type V1PodSpec,
	type V1ResourceRequirements,
	type V1Service,
} from '@kubernetes/client-node'

import type { PodSettings } from '@agentic/agents-domain'
import { uuid } from '@agentic/shared-domain'

const kubeConfig = new KubeConfig()
kubeConfig.loadFromDefault()
const coreV1 = kubeConfig.makeApiClient(CoreV1Api)

const NAMESPACE = 'default'

function getImage(language: 'python' | 'typescript', librarySet?: string) {
	// Example approach with 2 library sets for python:
	// data-science, cv-libs
	// TypeScript might just have a single base or also multiple sets.

	if (language === 'python') {
		switch (librarySet) {
			case 'cv-libs':
				return 'myregistry/python-cv-libs:latest' // custom image with opencv, scikit-image, etc.
			default:
				return 'myregistry/python-ds-libs:latest' // data-science libs: numpy, pandas, etc.
		}
	} else {
		// TS with various sets if desired
		return 'myregistry/node-ts:latest'
	}
}

/**
 * Create ephemeral Pod with resource constraints.
 *
 * No remote repository is involved, keeping the process fast and simple.
 * Changes are tracked locally in the pod’s filesystem.
 */
export async function createEphemeralPod(
	language: 'python' | 'typescript',
	codeToRun: string[],
	librarySet?: string,
) {
	const podName = `pod-${uuid()}`
	const image = getImage(language, librarySet)

	const command = [
		'/bin/sh',
		'-c',
		`mkdir -p /code && cd /code && git init && git config user.email "bot@agentic.com" && git config user.name "Bot" && echo '${codeToRun[2]}' > script.${language} && git add . && git commit -m "Initial commit" && ${codeToRun[0]} ${codeToRun[1]} /code/script.${language}`,
	]

	const container = { name: podName, image, command /* ... */ }
	// Deploy pod logic here
}

/**
 * Create ephemeral Service to expose a container that starts a web server.
 */
export async function createEphemeralService(
	podName: string,
	port = 3000,
): Promise<string> {
	const serviceName = `svc-${podName}`

	// Label the Pod
	await coreV1.patchNamespacedPod(
		podName,
		NAMESPACE,
		{ metadata: { labels: { app: podName } } },
		undefined,
		undefined,
		undefined,
		undefined,
		{ headers: { 'Content-type': 'application/merge-patch+json' } },
	)

	const service: V1Service = {
		metadata: { name: serviceName },
		spec: {
			selector: { app: podName },
			ports: [{ port, targetPort: port }],
			type: 'LoadBalancer',
		},
	}

	await coreV1.createNamespacedService(NAMESPACE, service)
	return serviceName
}

/**
 * Sandboxed Headless Browser (Puppeteer/Playwright) approach
 * We spin up a separate container image that has Chrome or Firefox installed.
 */
export async function createBrowserPod(settings: PodSettings): Promise<string> {
	const podName = `browser-${uuid()}`
	const image = 'myregistry/chrome-sandbox:latest'
	// Custom image with headless Chrome + puppeteer,
	// or a script that runs on container startup.

	const resources: V1ResourceRequirements = {
		limits: {
			cpu: settings.cpuLimit,
			memory: settings.memoryLimit,
		},
		requests: {
			cpu: settings.cpuLimit,
			memory: settings.memoryLimit,
		},
	}

	const container: V1Container = {
		name: podName,
		image: image,
		command: ['/bin/sh', '-c', 'sleep 3600'], // keep running
		resources,
	}

	const podSpec: V1PodSpec = {
		containers: [container],
		restartPolicy: 'Always',
		runtimeClassName: settings.runtimeClass,
	}

	const pod: V1Pod = {
		metadata: { name: podName },
		spec: podSpec,
	}

	await coreV1.createNamespacedPod(NAMESPACE, pod)
	return podName
}

/** Get logs from a container. */
export async function getPodLogs(podName: string): Promise<string> {
	const logsResponse = await coreV1.readNamespacedPodLog(
		podName,
		NAMESPACE,
		podName,
	)
	return logsResponse.body
}

/** Delete ephemeral Pod/Service. */
export async function deletePod(podName: string) {
	await coreV1.deleteNamespacedPod(podName, NAMESPACE)
}

export async function deleteService(serviceName: string) {
	await coreV1.deleteNamespacedService(serviceName, NAMESPACE)
}
