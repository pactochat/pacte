import {
	Column,
	ColumnType,
	type ColumnsType,
	Schema,
	Table,
} from '@powersync/common'
import { SchemaAST as AST, Schema as S } from 'effect'
// import { isColumnTypes } from 'effect-sql-kysely'

import { isColumnTypes } from './types'

/**
 * Converts a Kysely schema to the corresponding PowerSync schema.
 *
 * PowerSync sync rules use the SQLite type system. More on https://docs.powersync.com/usage/sync-rules/types.
 */
export function toPowerSyncSchema<Tables extends Record<string, S.Schema.Any>>(
	tables: Tables,
): Schema {
	return new Schema(
		// Object.entries(tables).map(([name, table]) => {
		// 	const properties = AST.getPropertySignatures(
		// 		isColumnTypes(table)
		// 			? S.encodedSchema(table.select).ast
		// 			: S.encodedSchema(table).ast,
		// 	)
		// return new Table({
		// 	name,
		// 	columns: properties.map(toPowerSyncColumn),
		// })

		Object.fromEntries(
			Object.entries(tables).map(([name, table]) => {
				const isLocalOnly = (table as any).localOnly === true
				const tableViewName = (table as any).viewName || name

				const properties = AST.getPropertySignatures(
					isColumnTypes(table)
						? S.encodedSchema(table.select).ast
						: S.encodedSchema(table).ast,
				)

				const columns: ColumnsType = {}
				for (const property of properties) {
					if (typeof property.name === 'string') {
						columns[property.name] = {
							type: toPowerSyncColumnType(property.type),
						}
					}
				}

				const tableOptions = {
					viewName: tableViewName,
					localOnly: isLocalOnly,
				}

				return [name, new Table(columns, tableOptions)]
			}),
		),
	)
}

export function toPowerSyncColumn(property: AST.PropertySignature): Column {
	return new Column({
		name: String(property.name),
		type: toPowerSyncColumnType(property.type),
	})
}

/**
 * Converts an Effect AST to the corresponding [PowerSync ColumnType](https://docs.powersync.com/usage/sync-rules/types) (they're the same as SQLite types).
 *
 * @param {AST.AST} ast - The AST node to convert.
 * @returns {ColumnType} The corresponding ColumnType.
 * @throws {Error} Throws an error if the AST node type is unsupported.
 */
export function toPowerSyncColumnType(ast: AST.AST): ColumnType {
	switch (ast._tag) {
		case 'AnyKeyword':
			return ColumnType.TEXT
		case 'BooleanKeyword':
			return ColumnType.INTEGER
		case 'Declaration':
			return ColumnType.TEXT
		case 'Enums':
			return ColumnType.TEXT
		case 'Literal': {
			const type = typeof ast.literal
			if (type === 'number') {
				return ColumnType.INTEGER
			}
			if (type === 'string') {
				return ColumnType.TEXT
			}
			return ColumnType.TEXT
		}
		case 'NeverKeyword':
			return ColumnType.TEXT
		case 'NumberKeyword':
			return ColumnType.INTEGER
		case 'ObjectKeyword':
			return ColumnType.TEXT
		case 'Refinement':
		case 'Transformation':
			return toPowerSyncColumnType(ast.from)
		case 'StringKeyword':
			return ColumnType.TEXT
		case 'Suspend':
			return toPowerSyncColumnType(ast.f())
		case 'SymbolKeyword':
			return ColumnType.TEXT
		case 'TemplateLiteral':
			return ColumnType.TEXT
		case 'TupleType': {
			// const allTypes = [
			// 	...ast.elements.map(e => toPowerSyncColumnType(e.type)),
			// 	...ast.rest.map(a => toPowerSyncColumnType(a.type)),
			// ]
			// if (allTypes.length === 0) {
			// 	throw new Error('Empty tuple types are not supported')
			// }
			// const uniqueTypes = Array.from(new Set(allTypes))

			// if (uniqueTypes.length === 1 && uniqueTypes[0] !== undefined) {
			// 	return uniqueTypes[0]
			// }

			// throw new Error(
			// 	`Unsupported tuple of mixed column types: ${uniqueTypes.join(', ')}`,
			// )

			return ColumnType.TEXT
		}
		case 'TypeLiteral':
			return ColumnType.TEXT
		case 'UndefinedKeyword':
			return ColumnType.TEXT
		case 'Union': {
			const types = Array.from(
				new Set(
					ast.types
						.filter(_ => _ !== AST.undefinedKeyword)
						.map(_ => toPowerSyncColumnType(_)),
				),
			)
			if (types.length === 1 && types[0] !== undefined) {
				return types[0]
			}

			throw new Error(`Unsupported union of column types: ${types.join(', ')}`)
		}
		case 'UniqueSymbol':
			return ColumnType.TEXT
		case 'UnknownKeyword':
			return ColumnType.TEXT
		case 'VoidKeyword':
			return ColumnType.TEXT
		default:
			return ColumnType.TEXT
	}
}

// function unknownColumnTypeError(ast: AST.AST): never {
// 	console.warn(`Unknown column type for AST node: ${ast._tag}`)
// 	throw new Error(`Unknown column type for AST node: ${ast._tag}`)
// }
