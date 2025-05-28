// import type {
// 	FolderId,
// 	GroupId,
// 	UserId,
// 	WorkspaceId,
// } from '@aipacto/workspace-domain'
// import {
// 	GroupManagementService,
// 	OpenFGAClient,
// 	WorkspaceAuthorizationService,
// } from '@aipacto/workspace-infra-authz'
// // packages/workspace/app/fastify/src/example-usage.ts
// import { Config, Effect, Layer } from 'effect'

// // Example: Setting up layers
// const AppLayers = Layer.mergeAll(
// 	OpenFGAClient.Live,
// 	WorkspaceAuthorizationService.Live,
// 	GroupManagementService.Live,
// )

// // Example: Creating a workspace with proper permissions
// const createWorkspaceWithPermissions = (params: {
// 	userId: UserId
// 	organizationId: string
// 	workspaceName: string
// 	teamGroupId?: GroupId
// }) =>
// 	Effect.gen(function* () {
// 		const authz = yield* AuthorizationService
// 		const workspace = yield* WorkspaceService
// 		const fga = yield* OpenFGAClient

// 		// Check if user can create workspaces in the organization
// 		const canCreate = yield* authz.check({
// 			userId: params.userId,
// 			action: 'write',
// 			resourceType: 'organization',
// 			resourceId: params.organizationId,
// 		})

// 		if (!canCreate) {
// 			return yield* Effect.fail(
// 				new Error('User cannot create workspaces in this organization'),
// 			)
// 		}

// 		// Create the workspace
// 		const newWorkspace = yield* workspace.createWorkspace({
// 			// ... workspace data
// 		})

// 		// Set up FGA tuples for the workspace
// 		const writes = [
// 			// User is owner of the workspace
// 			{
// 				user: `user:${params.userId}`,
// 				relation: 'owner',
// 				object: `workspace:${newWorkspace.id}`,
// 			},
// 			// Workspace belongs to organization
// 			{
// 				user: `organization:${params.organizationId}`,
// 				relation: 'organization',
// 				object: `workspace:${newWorkspace.id}`,
// 			},
// 		]

// 		// If team group is specified, give them editor access
// 		if (params.teamGroupId) {
// 			writes.push({
// 				user: `group:${params.teamGroupId}#member`,
// 				relation: 'editor',
// 				object: `workspace:${newWorkspace.id}`,
// 			})
// 		}

// 		yield* fga.write(writes)

// 		return newWorkspace
// 	})

// // Example: Sharing a folder with a team
// const shareFolderWithTeam = (params: {
// 	userId: UserId
// 	folderId: FolderId
// 	teamGroupId: GroupId
// 	level: 'viewer' | 'editor'
// }) =>
// 	Effect.gen(function* () {
// 		const authz = yield* AuthorizationService

// 		// Use the domain service which checks permissions
// 		yield* authz.grant({
// 			grantorId: params.userId,
// 			granteeType: 'group',
// 			granteeId: params.teamGroupId,
// 			resourceType: 'folder',
// 			resourceId: params.folderId,
// 			level: params.level,
// 		})

// 		yield* Effect.log(
// 			`Shared folder ${params.folderId} with team ${params.teamGroupId} as ${params.level}`,
// 		)
// 	})

// // Example: Setting up team structure
// const setupTeamStructure = () =>
// 	Effect.gen(function* () {
// 		const groups = yield* GroupManagementService

// 		// Create main engineering group
// 		yield* groups.createGroup({
// 			groupId: 'grp_engineering' as GroupId,
// 			name: 'Engineering Team',
// 			createdBy: 'user_admin' as UserId,
// 		})

// 		// Create frontend subgroup
// 		yield* groups.createGroup({
// 			groupId: 'grp_frontend' as GroupId,
// 			name: 'Frontend Team',
// 			createdBy: 'user_admin' as UserId,
// 		})

// 		// Make frontend a subgroup of engineering
// 		yield* groups.addSubgroup({
// 			parentGroupId: 'grp_engineering' as GroupId,
// 			childGroupId: 'grp_frontend' as GroupId,
// 			addedBy: 'user_admin' as UserId,
// 		})

// 		// Add members
// 		yield* groups.addMember({
// 			groupId: 'grp_frontend' as GroupId,
// 			userId: 'user_alice' as UserId,
// 			addedBy: 'user_admin' as UserId,
// 		})

// 		yield* groups.addMember({
// 			groupId: 'grp_engineering' as GroupId,
// 			userId: 'user_bob' as UserId,
// 			addedBy: 'user_admin' as UserId,
// 		})
// 	})

// // Example: Checking cascading permissions
// const checkFolderAccess = (params: {
// 	userId: UserId
// 	folderId: FolderId
// }) =>
// 	Effect.gen(function* () {
// 		const authz = yield* AuthorizationService
// 		const groups = yield* GroupManagementService

// 		// Check direct access
// 		const canRead = yield* authz.check({
// 			userId: params.userId,
// 			action: 'read',
// 			resourceType: 'folder',
// 			resourceId: params.folderId,
// 		})

// 		yield* Effect.log(`User ${params.userId} can read folder: ${canRead}`)

// 		// Check what groups the user belongs to
// 		const userGroups = yield* groups.listUserGroups(params.userId)
// 		yield* Effect.log(`User belongs to groups:`, userGroups)

// 		// If user can read, check what level of access they have
// 		if (canRead) {
// 			const canWrite = yield* authz.check({
// 				userId: params.userId,
// 				action: 'write',
// 				resourceType: 'folder',
// 				resourceId: params.folderId,
// 			})

// 			const canShare = yield* authz.check({
// 				userId: params.userId,
// 				action: 'share',
// 				resourceType: 'folder',
// 				resourceId: params.folderId,
// 			})

// 			yield* Effect.log(
// 				`Access levels - Write: ${canWrite}, Share: ${canShare}`,
// 			)
// 		}

// 		return canRead
// 	})

// // Example: Batch permission check for listing
// const listAccessibleWorkspaces = (userId: UserId) =>
// 	Effect.gen(function* () {
// 		const workspace = yield* WorkspaceService
// 		const authz = yield* AuthorizationService

// 		// Get all workspaces in the system (would be filtered by org in practice)
// 		const allWorkspaces = yield* workspace.listWorkspaces('org_123')

// 		// Filter to only those the user can view
// 		const accessible = yield* authz.filterByPermission({
// 			userId,
// 			action: 'read',
// 			resourceType: 'workspace',
// 			resources: allWorkspaces,
// 		})

// 		yield* Effect.log(
// 			`User has access to ${accessible.length} of ${allWorkspaces.length} workspaces`,
// 		)

// 		return accessible
// 	})

// // Example: Running with proper configuration
// const program = Effect.gen(function* () {
// 	// Setup team structure
// 	yield* setupTeamStructure()

// 	// Create a workspace
// 	const workspace = yield* createWorkspaceWithPermissions({
// 		userId: 'user_alice' as UserId,
// 		organizationId: 'org_123',
// 		workspaceName: 'Q1 Project',
// 		teamGroupId: 'grp_engineering' as GroupId,
// 	})

// 	// Check access for different users
// 	yield* checkFolderAccess({
// 		userId: 'user_alice' as UserId, // Owner - should have access
// 		folderId: 'fold_123' as FolderId,
// 	})

// 	yield* checkFolderAccess({
// 		userId: 'user_bob' as UserId, // Engineering team member - should have access
// 		folderId: 'fold_123' as FolderId,
// 	})

// 	yield* checkFolderAccess({
// 		userId: 'user_charlie' as UserId, // Not in team - no access
// 		folderId: 'fold_123' as FolderId,
// 	})
// }).pipe(
// 	Effect.provide(AppLayers),
// 	Effect.provide(
// 		Layer.setConfigProvider(
// 			Config.ConfigProvider.fromMap(
// 				new Map([
// 					['OPENFGA_API_URL', 'http://localhost:8080'],
// 					['OPENFGA_STORE_ID', 'store_123'],
// 					['OPENFGA_API_TOKEN', 'secret_token'],
// 				]),
// 			),
// 		),
// 	),
// )

// // Run the program
// Effect.runPromise(program).catch(console.error)
