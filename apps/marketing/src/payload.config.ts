import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import {
	BoldFeature,
	FixedToolbarFeature,
	HeadingFeature,
	InlineToolbarFeature,
	ItalicFeature,
	LinkFeature,
	lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
	admin: {
		user: Users.slug,
		importMap: {
			baseDir: path.resolve(dirname),
		},
	},
	collections: [Media, Pages, Users],
	editor: lexicalEditor({
		features: () => {
			return [
				BoldFeature(),
				ItalicFeature(),
				HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3'] }),
				FixedToolbarFeature(),
				InlineToolbarFeature(),
			]
		},
	}),
	email: resendAdapter({
		defaultFromAddress: 'dev@payloadcms.com',
		defaultFromName: 'Payload CMS',
		apiKey: process.env.RESEND_API_KEY || '',
	}),
	secret: process.env.PAYLOAD_SECRET || '',
	typescript: {
		outputFile: path.resolve(dirname, 'payload-types.ts'),
	},
	db: postgresAdapter({
		pool: {
			connectionString: process.env.DATABASE_URI || '',
		},
	}),
	// Set CORS rules pointing to the hosted domains for the frontend to be able to submit to Payload API
	cors: [process.env.NEXT_PUBLIC_PAYLOAD_URL || ''],
	sharp,
	plugins: [
		payloadCloudPlugin(),
		formBuilderPlugin({}),
		// storage-adapter-placeholder
	],
	localization: {
		locales: ['ca', 'en', 'es'],
		defaultLocale: 'en',
	},
})
