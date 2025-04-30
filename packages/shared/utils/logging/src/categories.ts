import { LogLevel } from 'typescript-logging'
import { CategoryProvider } from 'typescript-logging-category-style'

export const rootProvider = CategoryProvider.createProvider('@xiroi', {
	level: LogLevel.Debug,
})

// Root categories for each bounded context
export const logApps = rootProvider.getCategory('apps')
export const logAgents = rootProvider.getCategory('agents')
export const logShared = rootProvider.getCategory('shared')
export const logUi = rootProvider.getCategory('ui')

// Agents bounded context subcategories
export const logAgentsDomain = logAgents.getChildCategory('domain')
export const logAgentsInfra = logAgents.getChildCategory('infra')
export const logAgentsRepo = logAgents.getChildCategory('repos')

// Shared subcategories
export const logSharedDomain = logShared.getChildCategory('domain')
export const logSharedUtils = logShared.getChildCategory('utils')

// Shared infrastructure subcategories
const logSharedInfra = logShared.getChildCategory('infra')
export const logSharedInfraUiCore = logSharedInfra.getChildCategory('ui-core')
export const logSharedInfraUiLocalization =
	logSharedInfra.getChildCategory('ui-localization')
export const logSharedInfraUiRouting =
	logSharedInfra.getChildCategory('ui-routing')

// Apps
export const logAppServer = logApps.getChildCategory('server')
export const logAppExpo = logApps.getChildCategory('expo')

// Expo subcategories
export const logExpoAuth = logAppExpo.getChildCategory('auth')
export const logExpoAuthenticated =
	logExpoAuth.getChildCategory('authenticated')
export const logExpoAuthComponents = logExpoAuth.getChildCategory('components')
export const logExpoAuthHooks = logExpoAuth.getChildCategory('hooks')

// Expo pages
export const logExpoPagesAuth = logAppExpo.getChildCategory('pages.auth')
export const logExpoPagesSettings =
	logAppExpo.getChildCategory('pages.settings')
