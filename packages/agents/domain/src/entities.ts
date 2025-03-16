import { Schema as S } from 'effect'

import { Entity } from '@pacto-chat/shared-domain'

export class FileVersion extends S.Class<FileVersion>(
	'@pacto-chat/agents-domain/FileVersion',
)({
	...Entity.fields,
	versionId: S.UUID,
	content: S.String,
	timestamp: S.Number.pipe(S.int(), S.positive()), // Unix timestamp in milliseconds
}) {}

export const Language = S.Literal('python', 'typescript')
export type Language = S.Schema.Type<typeof Language>

export class FileInfo extends S.Class<FileInfo>(
	'@pacto-chat/agents-domain/FileInfo',
)({
	...Entity.fields,
	fileId: S.UUID,
	filename: S.String.pipe(S.minLength(1), S.trimmed()),
	versions: S.Array(FileVersion),
	librarySet: S.optional(S.String), // e.g., "data-science", "cv-libs"
	language: Language,
}) {}

export class Project extends S.Class<Project>('@pacto-chat/agents-domain/Project')(
	{
		...Entity.fields,
		userId: S.UUID,
		projectId: S.UUID,
		name: S.String.pipe(S.minLength(1)),
		files: S.Array(FileInfo),
		hostingConfig: S.optional(
			S.Struct({
				port: S.Number.pipe(S.int(), S.positive()),
				isPermanent: S.Boolean,
			}),
		),
	},
) {}

export class PodSettings extends S.Class<PodSettings>(
	'@pacto-chat/agents-domain/PodSettings',
)({
	...Entity.fields,
	runtimeClass: S.String.pipe(S.minLength(1)), // e.g., "kata"
	cpuLimit: S.String.pipe(S.pattern(/^\d+m$/)), // e.g., "500m"
	memoryLimit: S.String.pipe(S.pattern(/^\d+(Mi|Gi)$/)), // e.g., "512Mi"
	timeQuotaSeconds: S.Number.pipe(S.int(), S.positive()), // e.g., 30 or 60
}) {}

export const TaskComplexity = S.Literal('light', 'medium', 'heavy')
export type TaskComplexity = S.Schema.Type<typeof TaskComplexity>
