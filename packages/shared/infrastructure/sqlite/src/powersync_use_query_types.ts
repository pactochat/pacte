export interface CompilableGetter<T> {
	execute(): Promise<T[]>
	compile(): CompiledGetter
}

export interface CompiledGetter {
	readonly sql: string
	readonly parameters: ReadonlyArray<unknown>
}
