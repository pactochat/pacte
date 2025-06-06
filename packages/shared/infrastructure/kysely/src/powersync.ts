import { UpdateType } from '@powersync/common'
import { Schema as S } from 'effect'

import { TableWorkspaceNames } from './tables'

export class PowerSyncCrudEntryOutputJSON extends S.Class<PowerSyncCrudEntryOutputJSON>(
	'PowerSyncCrudEntryOutputJSON',
)({
	data: S.optional(S.Record({ key: S.String, value: S.Any })),
	id: S.String,
	// op: S.Literal('PUT', 'PATCH', 'DELETE'), // UpdateType
	op: S.Enums(UpdateType),
	op_id: S.String,
	type: S.Enums(TableWorkspaceNames),
	tx_id: S.optional(S.Number.pipe(S.NullOr)),
}) {}

export const RequestBody = S.NonEmptyArray(PowerSyncCrudEntryOutputJSON)
export const ResponseBody = S.Struct({ message: S.String })
