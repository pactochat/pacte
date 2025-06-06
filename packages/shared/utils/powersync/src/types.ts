// Extended type definition for Table creation options
export interface TableOptions {
	localOnly?: boolean
	viewName?: string
}

// Symbol for ColumnTypesId
export const ColumnTypesId = Symbol.for('powersync/ColumnTypesId')
export type ColumnTypesId = typeof ColumnTypesId

// ColumnTypes interface
export interface ColumnTypes<Select, Insert, Update> {
	readonly [ColumnTypesId]: ColumnTypesId
	readonly select: Select
	readonly insert: Insert
	readonly update: Update
}

// isColumnTypes function
export function isColumnTypes(
	value: unknown,
): value is ColumnTypes<any, any, any> {
	return typeof value === 'object' && value !== null && ColumnTypesId in value
}

// Table type
export type Table<Columns> = {
	[K in keyof Columns]: Columns[K] extends ColumnTypes<
		infer S,
		infer I,
		infer U
	>
		? ColumnTypes<S, I, U>
		: Columns[K]
} & ColumnTypes<
	{
		[K in keyof Columns]: Columns[K] extends ColumnTypes<infer S, any, any>
			? S
			: Columns[K]
	},
	{
		[K in keyof Columns]: Columns[K] extends ColumnTypes<any, infer I, any>
			? I
			: Columns[K]
	},
	{
		[K in keyof Columns]: Columns[K] extends ColumnTypes<any, any, infer U>
			? U
			: Columns[K]
	}
>

// Helper function to create a Table
export function createTable<Columns extends Record<string, any>>(
	columns: Columns,
	options: TableOptions = {},
): Table<Columns> {
	const select: any = {}
	const insert: any = {}
	const update: any = {}

	for (const [key, value] of Object.entries(columns)) {
		if (isColumnTypes(value)) {
			select[key] = value.select
			insert[key] = value.insert
			update[key] = value.update
		} else {
			select[key] = value
			insert[key] = value
			update[key] = value
		}
	}

	const table = Object.assign({}, columns, {
		[ColumnTypesId]: ColumnTypesId,
		select,
		insert,
		update,
	})

	// Store options on the table object
	if (options.localOnly !== undefined) {
		;(table as any).localOnly = options.localOnly
	}
	if (options.viewName !== undefined) {
		;(table as any).viewName = options.viewName
	}

	return table as Table<Columns>
}
