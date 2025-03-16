/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_DATABASE_SQLITE_NAME: string
	readonly VITE_POWERSYNC_URL: string
	readonly VITE_SERVER_URL: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
