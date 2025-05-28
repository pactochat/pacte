import { Context, Effect, Layer } from 'effect'

import type { GroupId, UserId } from '@aipacto/workspace-domain'
import { OpenFGAClient } from './openfga_client'

const make = Effect.gen(function* () {
	const fga = yield* OpenFGAClient

	return {
		/**
		 * Create a new group
		 */
		createGroup: (params: {
			groupId: GroupId
			name: string
			createdBy: UserId
		}) =>
			Effect.gen(function* () {
				// In this model, groups don't have explicit creation in FGA
				// They exist when members are added to them
				// This is mainly for logging/tracking
				yield* Effect.log(
					`Group created: ${params.groupId} by ${params.createdBy}`,
				)
				return { groupId: params.groupId, name: params.name }
			}),

		/**
		 * Add user to group
		 */
		addMember: (params: {
			groupId: GroupId
			userId: UserId
			addedBy: UserId
		}) =>
			Effect.gen(function* () {
				yield* fga.write([
					{
						user: `user:${params.userId}`,
						relation: 'direct_member',
						object: `group:${params.groupId}`,
					},
				])

				yield* Effect.log(`Added ${params.userId} to group ${params.groupId}`)
			}),

		/**
		 * Remove user from group
		 */
		removeMember: (params: {
			groupId: GroupId
			userId: UserId
			removedBy: UserId
		}) =>
			Effect.gen(function* () {
				yield* fga.delete([
					{
						user: `user:${params.userId}`,
						relation: 'direct_member',
						object: `group:${params.groupId}`,
					},
				])

				yield* Effect.log(
					`Removed ${params.userId} from group ${params.groupId}`,
				)
			}),

		/**
		 * Add group as subgroup of another group
		 */
		addSubgroup: (params: {
			parentGroupId: GroupId
			childGroupId: GroupId
			addedBy: UserId
		}) =>
			Effect.gen(function* () {
				yield* fga.write([
					{
						user: `group:${params.childGroupId}`,
						relation: 'subgroup',
						object: `group:${params.parentGroupId}`,
					},
				])

				yield* Effect.log(
					`Added ${params.childGroupId} as subgroup of ${params.parentGroupId}`,
				)
			}),

		/**
		 * List members of a group
		 */
		listMembers: (groupId: GroupId) =>
			Effect.gen(function* () {
				const directMembers = yield* fga.listUsers({
					object: {
						type: 'group',
						id: groupId,
					},
					relation: 'direct_member',
					userFilter: { type: 'user' },
				})

				// Get all members including those from subgroups
				const allMembers = yield* fga.listUsers({
					object: {
						type: 'group',
						id: groupId,
					},
					relation: 'member',
					userFilter: { type: 'user' },
				})

				return {
					directMembers: directMembers.map(u => u.replace('user:', '')),
					allMembers: allMembers.map(u => u.replace('user:', '')),
				}
			}),

		/**
		 * List groups a user belongs to
		 */
		listUserGroups: (userId: UserId) =>
			Effect.gen(function* () {
				// Get direct memberships
				const directGroups = yield* fga.listObjects({
					user: `user:${userId}`,
					relation: 'direct_member',
					type: 'group',
				})

				// Get all groups including through subgroup membership
				const allGroups = yield* fga.listObjects({
					user: `user:${userId}`,
					relation: 'member',
					type: 'group',
				})

				return {
					directGroups: directGroups.map(g => g.replace('group:', '')),
					allGroups: allGroups.map(g => g.replace('group:', '')),
				}
			}),
	} as const
})

export class GroupManagementService extends Context.Tag(
	'GroupManagementService',
)<GroupManagementService, Effect.Effect.Success<typeof make>>() {
	static readonly Live = Layer.effect(this, make)
}
