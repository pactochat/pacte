// For Expo (Native)
declare module '@env' {
	export interface ProcessEnv {
		readonly [key: `EXPO_PUBLIC_${string}`]: string
	}
}

// Required for Vite
interface ImportMeta {
	readonly env: ImportMetaEnv
}

// For Vite (Web)
interface ImportMetaEnv {
	readonly [key: `VITE_${string}`]: string
}
