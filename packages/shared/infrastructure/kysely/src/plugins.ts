import {
	SerializePlugin,
	type SerializePluginOptions,
	dateRegex,
	defaultDeserializer,
	defaultSerializer,
} from 'kysely-plugin-serialize'

/**
 * Custom serializer for Kysely that skips serializing boolean and dates values.
 *
 * It complains with entities and PowerSync types https://docs.powersync.com/usage/sync-rules/types.
 *
 * More about list of serialized types of the plugin at https://github.com/subframe7536/kysely-sqlite-tools/blob/master/packages/plugin-serialize.
 */
export class CustomSerializePlugin extends SerializePlugin {
	constructor(options: SerializePluginOptions = {}) {
		super({
			...options,
			serializer: value => {
				// Skip booleans and integers PowerSync types https://docs.powersync.com/usage/sync-rules/types
				if (value === 0 || value === 1) return value

				// Skip DateTime transformation done by the plugin
				if (typeof value === 'string' && dateRegex.test(value)) return value

				return options.serializer
					? options.serializer(value)
					: defaultSerializer(value)
			},
			deserializer: value => {
				// Skip transformation of booleans (0, 1) by the plugin
				if (value === 0 || value === 1) return value

				// Skip DateTime transformation done by the plugin
				if (typeof value === 'string' && dateRegex.test(value)) return value

				return options.deserializer
					? options.deserializer(value)
					: defaultDeserializer(value)
			},
		})
	}
}
