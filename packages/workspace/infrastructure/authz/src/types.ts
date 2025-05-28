import { Schema as S } from 'effect'

export const PermissionAction = S.Union(
	S.Literal('read'),
	S.Literal('write'),
	S.Literal('delete'),
	S.Literal('share'),
	S.Literal('change_owner'),
)
export type PermissionAction = typeof PermissionAction.Type

export const PermissionLevel = S.Union(
	S.Literal('owner'),
	S.Literal('editor'),
	S.Literal('commenter'),
	S.Literal('viewer'),
)
export type PermissionLevel = typeof PermissionLevel.Type

export const ResourceType = S.Union(
	S.Literal('organization'),
	S.Literal('workspace'),
	S.Literal('folder'),
	S.Literal('doc'),
	S.Literal('file'),
	S.Literal('group'),
)
export type ResourceType = typeof ResourceType.Type
