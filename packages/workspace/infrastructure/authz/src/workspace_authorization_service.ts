import { Context, Effect, Layer } from 'effect'

import type { UserId } from '@aipacto/workspace-domain'
import { AuthorizationCheckError } from './errors'
import { OpenFGAClient } from './openfga_client'
import type { PermissionAction, PermissionLevel, ResourceType } from './types'

const make = Effect.gen(function* () {
	const fga = yield* OpenFGAClient

	const service = {
		/**
		 * Check if user can perform action on resource
		 */
		check: (params: {
			userId: UserId
			action: PermissionAction
			resourceType: ResourceType
			resourceId: string
		}) =>
			Effect.gen(function* () {
				// Map domain actions to FGA relations
				const relation = mapActionToRelation(params.action, params.resourceType)

				const allowed = yield* fga.check({
					user: `user:${params.userId}`,
					relation,
					object: `${params.resourceType}:${params.resourceId}`,
				})

				if (!allowed) {
					yield* Effect.log(
						`Access denied: ${params.userId} cannot ${params.action} ${params.resourceType}:${params.resourceId}`,
					)
				}

				return allowed
			}),

		/**
		 * Filter resources by permission
		 */
		filterByPermission: <T extends { id: string }>(params: {
			userId: UserId
			action: PermissionAction
			resourceType: ResourceType
			resources: readonly T[]
		}) =>
			Effect.gen(function* () {
				if (params.resources.length === 0) return []

				const relation = mapActionToRelation(params.action, params.resourceType)

				const checks = params.resources.map((resource, index) => ({
					user: `user:${params.userId}`,
					relation,
					object: `${params.resourceType}:${resource.id}`,
					correlationId: `resource-${index}`,
				}))

				const results = yield* fga.batchCheck(checks)

				// Map results back to resources
				const allowedMap = new Map(
					results.map(r => [r.correlationId, r.allowed]),
				)

				return params.resources.filter(
					(_, index) => allowedMap.get(`resource-${index}`) ?? false,
				)
			}),

		/**
		 * Grant permission to user or group
		 */
		grant: (params: {
			grantorId: UserId
			granteeType: 'user' | 'group'
			granteeId: string
			resourceType: ResourceType
			resourceId: string
			level: string
		}) =>
			Effect.gen(function* () {
				// First check if grantor can share
				const canShare = yield* service.check({
					userId: params.grantorId,
					action: 'share',
					resourceType: params.resourceType,
					resourceId: params.resourceId,
				})

				if (!canShare) {
					return yield* Effect.fail(
						new AuthorizationCheckError({
							message: 'User cannot share this resource',
							userId: params.grantorId,
							action: 'share',
							resource: `${params.resourceType}:${params.resourceId}`,
						}),
					)
				}

				// Map permission level to FGA relation
				const relation = mapPermissionLevelToRelation(
					params.level as PermissionLevel,
				)

				// Write the tuple
				const user =
					params.granteeType === 'group'
						? `group:${params.granteeId}#member`
						: `user:${params.granteeId}`

				yield* fga.write([
					{
						user,
						relation,
						object: `${params.resourceType}:${params.resourceId}`,
					},
				])

				yield* Effect.log(
					`Granted ${params.level} on ${params.resourceType}:${params.resourceId} to ${user}`,
				)
			}),

		/**
		 * Revoke permission from user or group
		 */
		revoke: (params: {
			revokerId: UserId
			granteeType: 'user' | 'group'
			granteeId: string
			resourceType: ResourceType
			resourceId: string
		}) =>
			Effect.gen(function* () {
				// Check if revoker can manage permissions
				const canShare = yield* service.check({
					userId: params.revokerId,
					action: 'share',
					resourceType: params.resourceType,
					resourceId: params.resourceId,
				})

				if (!canShare) {
					return yield* Effect.fail(
						new AuthorizationCheckError({
							message: 'User cannot manage permissions for this resource',
							userId: params.revokerId,
							action: 'share',
							resource: `${params.resourceType}:${params.resourceId}`,
						}),
					)
				}

				const user =
					params.granteeType === 'group'
						? `group:${params.granteeId}#member`
						: `user:${params.granteeId}`

				// Delete all permission tuples for this user/group on this resource
				const relations = ['viewer', 'commenter', 'editor', 'owner']
				const deletes =
					params.resourceType === 'folder'
						? [...relations, 'contributor']
						: relations

				yield* fga.delete(
					deletes.map(relation => ({
						user,
						relation,
						object: `${params.resourceType}:${params.resourceId}`,
					})),
				)

				yield* Effect.log(
					`Revoked all permissions on ${params.resourceType}:${params.resourceId} from ${user}`,
				)
			}),

		/**
		 * List all resources of a type that a user has access to
		 */
		listAccessibleResources: (params: {
			userId: UserId
			resourceType: ResourceType
			action: PermissionAction
		}) =>
			Effect.gen(function* () {
				const relation = mapActionToRelation(params.action, params.resourceType)

				const objects = yield* fga.listObjects({
					user: `user:${params.userId}`,
					relation,
					type: params.resourceType,
				})

				// Extract IDs from the object strings (e.g., "document:123" -> "123")
				return objects.map(obj => obj.split(':')[1])
			}),

		/**
		 * List all users who have access to a resource
		 */
		listResourceUsers: (params: {
			resourceType: ResourceType
			resourceId: string
			action: PermissionAction
		}) =>
			Effect.gen(function* () {
				const relation = mapActionToRelation(params.action, params.resourceType)

				const users = yield* fga.listUsers({
					object: {
						type: params.resourceType,
						id: params.resourceId,
					},
					relation,
					userFilter: { type: 'user' },
				})

				// Extract user IDs from the user strings (e.g., "user:123" -> "123")
				return users
					.filter(u => u.startsWith('user:'))
					.map(u => u.replace('user:', '') as UserId)
			}),
	}

	return service
})

// Helper functions
function mapActionToRelation(
	action: PermissionAction,
	resourceType: ResourceType,
): string {
	switch (action) {
		case 'read':
			return resourceType === 'folder' ? 'can_view_content' : 'can_read'
		case 'write':
			return resourceType === 'folder' ? 'can_create_file' : 'can_write'
		case 'delete':
			return 'can_delete'
		case 'share':
			return 'can_share'
		case 'change_owner':
			return 'can_change_owner'
		default:
			return 'can_read'
	}
}

function mapPermissionLevelToRelation(level: PermissionLevel): string {
	switch (level) {
		case 'owner':
			return 'owner'
		case 'editor':
			return 'editor'
		case 'commenter':
			return 'commenter'
		case 'viewer':
			return 'viewer'
		default:
			return 'viewer'
	}
}

export class WorkspaceAuthorizationService extends Context.Tag(
	'WorkspaceAuthorizationService',
)<WorkspaceAuthorizationService, Effect.Effect.Success<typeof make>>() {
	static readonly Live = Layer.effect(this, make)
}
