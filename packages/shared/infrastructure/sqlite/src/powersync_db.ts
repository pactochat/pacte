import { PowerSyncDatabase } from '@powersync/react-native'
import { Context, Effect, Layer } from 'effect'

export class PowerSyncDb extends Context.Tag('PowerSyncDb')<
	PowerSyncDb,
	typeof PowerSyncDatabase
>() {
	static readonly Live = Layer.effect(
		this,
		Effect.promise(async () => {
			return PowerSyncDatabase
		}),
	)
}
