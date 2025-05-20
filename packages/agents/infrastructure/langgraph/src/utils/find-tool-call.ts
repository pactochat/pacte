import type { ZodTypeAny, z } from 'zod'

interface ToolCall {
	name: string
	args: Record<string, any>
	id?: string
	type?: 'tool_call'
}

/**
 * Helper function to find a specific tool call by name
 * @param name Name of the tool to find
 * @returns Function that checks if a tool call matches the name
 */
export function findToolCall<Name extends string>(name: Name) {
	return <Args extends ZodTypeAny>(
		x: ToolCall,
	): x is { name: Name; args: z.infer<Args>; id?: string } => x.name === name
}
