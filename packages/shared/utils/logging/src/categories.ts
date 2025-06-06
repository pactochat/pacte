import { LogLevel } from 'typescript-logging'
import { CategoryProvider } from 'typescript-logging-category-style'

// Root categories
export const rootProvider = CategoryProvider.createProvider('@aipacto', {
	level: LogLevel.Debug,
})
const logApps = rootProvider.getCategory('apps')
const logShared = rootProvider.getCategory('shared')
const logAgents = rootProvider.getCategory('agents')
const logWorkspace = rootProvider.getCategory('workspace')

// Shared
export const logSharedDomain = logShared.getChildCategory('domain')
export const logSharedUtils = logShared.getChildCategory('utils')
const logSharedUi = logShared.getChildCategory('ui')

// Shared UI
export const logSharedUiCore = logSharedUi.getChildCategory('core')
export const logSharedUiLocalization =
	logSharedUi.getChildCategory('localization')

// Agents
export const logAgentsInfraLangchain = logAgents
	.getChildCategory('infra')
	.getChildCategory('langchain')

// Workspace
export const logWorkspaceInfraAuthz = logWorkspace
	.getChildCategory('infra')
	.getChildCategory('authz')

// Apps
export const logAppServer = logApps.getChildCategory('server')
export const logAppExpo = logApps.getChildCategory('expo')

// Expo
export const logExpoAuth = logAppExpo.getChildCategory('auth')
export const logExpoAuthenticated =
	logExpoAuth.getChildCategory('authenticated')
export const logExpoComponents = logAppExpo.getChildCategory('components')
export const logExpoHooks = logAppExpo.getChildCategory('hooks')
export const logExpoProviders = logAppExpo.getChildCategory('providers')

// Expo pages
export const logExpoPagesAuth = logAppExpo.getChildCategory('pages.auth')
export const logExpoPagesSettings =
	logAppExpo.getChildCategory('pages.settings')
