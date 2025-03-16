import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
	Outlet,
	createRootRoute,
	createRoute,
	lazyRouteComponent,
	redirect,
} from '@tanstack/react-router'

import {
	ListSupportedLanguagesCodes,
	ListSupportedLanguagesMapperIso3to1,
} from '@pacto-chat/shared-domain'
import { AuthRedirect } from '@pacto-chat/shared-infra-ui-providers'
import {
	type RouteKey,
	extractLanguageFromPath,
	isValidRoute,
	routes,
} from '@pacto-chat/shared-infra-ui-routing'
import {
	CoPage,
	CoText,
	CoToastViewport,
} from '@pacto-chat/shared-ui-components'
import { TamaguiProvider } from '@pacto-chat/shared-ui-core'
import { tamaguiConfig } from '@pacto-chat/shared-ui-core'
import {
	LocalizationProvider,
	detectDeviceLanguage,
	useTranslation,
} from '@pacto-chat/shared-ui-localization'
import { Layout, RouterDevtools } from '~components/index.js'
import { PowerSyncProvider } from '~database/powersync.js'
import {
	LanguageRedirect,
	LocalDataInitializer,
	ServerSyncProvider,
	SessionSynchronizer,
	ThemeProvider,
} from '~providers/index.js'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 2,
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes
			refetchOnWindowFocus: import.meta.env.PROD, // Only in production
			refetchOnMount: true,
		},
		mutations: {
			retry: 1,
			networkMode: 'always',
		},
	},
	// queryCache: {
	// 	onError: (error, query) => {
	// 		console.error(`Query error: ${error}`, query)
	// 		// Could add global error reporting here
	// 	},
	// },
	// mutationCache: {
	// 	onError: (error, variables, context, mutation) => {
	// 		console.error(`Mutation error: ${error}`, mutation)
	// 		// Could add global error reporting here
	// 	},
	// },
})

/**
 * Root route configuration for the application.
 * Wraps all routes with LanguageRedirect to ensure proper language handling.
 *
 * Features:
 * - Sets up meta tags and SEO information
 * - Configures font preloading
 * - Provides a 404 Not Found page
 */
export const routeRoot = createRootRoute({
	head: () => {
		const defaultTitle = 'Xiroi'
		const defaultDescription =
			'Store and read your favorite quotes in collections'

		return {
			title: defaultTitle,
			meta: [
				{ charSet: 'utf-8' },
				{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
				{ name: 'description', content: defaultDescription },
				{ property: 'og:title', content: defaultTitle },
				{ property: 'og:description', content: defaultDescription },
				{ property: 'og:type', content: 'website' },
				{ name: 'robots', content: 'index,follow' },
			],
			links: [
				{ rel: 'icon', href: '/favicon.ico' },
				{ rel: 'manifest', href: '/site.webmanifest' },
				{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				{
					rel: 'preconnect',
					href: 'https://fonts.gstatic.com',
					crossOrigin: 'anonymous',
				},
				{
					rel: 'stylesheet',
					href: 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap',
				},
				{
					rel: 'stylesheet',
					href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap',
				},
				{
					rel: 'stylesheet',
					href: 'https://fonts.googleapis.com/css2?family=Literata:wght@400;500;700&display=swap',
				},
			],
		}
	},
	component: () => {
		const pathname = window.location.pathname
		const langCode = extractLanguageFromPath(pathname)

		// Validate language code is supported
		const isValidLang = langCode && langCode in ListSupportedLanguagesCodes
		const initialLang = isValidLang
			? (langCode as ListSupportedLanguagesCodes)
			: undefined

		return (
			<TamaguiProvider config={tamaguiConfig}>
				<ThemeProvider>
					<LocalizationProvider initialLanguage={initialLang}>
						<QueryClientProvider client={queryClient}>
							<SessionSynchronizer>
								<PowerSyncProvider>
									<LocalDataInitializer>
										<ServerSyncProvider>
											<>
												<Outlet />
												<CoToastViewport />
												<RouterDevtools />
											</>
										</ServerSyncProvider>
									</LocalDataInitializer>
								</PowerSyncProvider>
							</SessionSynchronizer>
							<ReactQueryDevtools position='top' />
						</QueryClientProvider>
					</LocalizationProvider>
				</ThemeProvider>
			</TamaguiProvider>
		)
	},
	notFoundComponent: () => {
		const { t } = useTranslation()
		return (
			<CoPage componentName='not-found' title={t('pages.not_found.title')}>
				<CoText>{t('pages.not_found.txt')}</CoText>
			</CoPage>
		)
	},
})

export const routeIndex = createRoute({
	getParentRoute: () => routeRoot,
	path: '/',
	beforeLoad: ({ location }) => {
		// Skip redirect for auth routes
		if (location.pathname.startsWith('/auth')) return

		const detectedLang = detectDeviceLanguage()
		const browserLang = ListSupportedLanguagesMapperIso3to1[detectedLang]

		throw redirect({
			to: '/$lang',
			params: { lang: browserLang },
			replace: true,
		})
	},
})

/**
 * Layout route that handles language-based routing.
 * All content routes are children of this route.
 *
 * URL Structure: /{language}/{route}
 * Example URLs:
 * - /eng/settings
 * - /spa/library
 *
 * Language Handling:
 * 1. Checks if URL starts with a valid language code
 * 2. If no language code or invalid:
 *    - Tries to use detected device language
 *    - Redirects to appropriate URL with language prefix
 * 3. If URL is invalid even with language, shows 404
 */
export const routeLayout = createRoute({
	getParentRoute: () => routeRoot,
	path: '$lang',
	component: () => (
		<LanguageRedirect>
			<Layout />
		</LanguageRedirect>
	),
	beforeLoad: async ({ location }) => {
		// Skip redirect for auth routes
		if (location.pathname.startsWith('/auth')) return

		// Get path segments
		const segments = location.pathname.split('/').filter(Boolean)
		const maybeLang = segments[0]

		// If maybeLang is a recognized language, let them in:
		if (maybeLang && maybeLang in ListSupportedLanguagesCodes) {
			return
		}

		// If no language in path, check if it would be valid with a language prefix
		const currentPath = location.pathname
		const detectedLang =
			detectDeviceLanguage() || ListSupportedLanguagesMapperIso3to1.eng

		// First check if the path would be valid with the detected language
		if (isValidRoute(`/${detectedLang}${currentPath}`)) {
			throw redirect({
				to: getRoutePath(currentPath),
				params: { lang: detectedLang },
				search: location.search ? {} : true,
				replace: true,
			})
		}

		// If not valid with detected lang, check other languages
		for (const lang of Object.keys(ListSupportedLanguagesCodes)) {
			if (lang !== detectedLang && isValidRoute(`/${lang}${currentPath}`)) {
				throw redirect({
					to: getRoutePath(currentPath),
					params: { lang },
					search: location.search ? {} : true,
					replace: true,
				})
			}
		}

		// If we get here, no valid route was found with any language
		// Let it continue to show Not Found
	},
})

/**
 * Library route - Shows the user's quote library
 * URL: /{language}/library
 */
export const routeLibrary = createRoute({
	getParentRoute: () => routeLayout,
	path: 'library',
	component: lazyRouteComponent(
		() => import('@pacto-chat/ui-pages-library'),
		'PageLibrary',
	),
	errorComponent: () => <CoPage componentName='library' error />,
})

/**
 * Settings route - User preferences and account settings
 * URL: /{language}/settings
 */
export const routeSettings = createRoute({
	getParentRoute: () => routeLayout,
	path: 'settings',
	component: lazyRouteComponent(
		() => import('@pacto-chat/ui-pages-settings'),
		'PageSettings',
	),
	errorComponent: () => <CoPage componentName='settings' error />,
})

export const routeAuth = createRoute({
	getParentRoute: () => routeRoot,
	path: 'auth',
	component: () => (
		<>
			<AuthRedirect />
			<Outlet />
		</>
	),
	validateSearch: search => ({
		redirectTo: search.redirectTo as string | undefined,
	}),
})

/**
 * Login routes
 */
export const routeLogin = createRoute({
	getParentRoute: () => routeAuth,
	path: 'login',
	component: lazyRouteComponent(
		() => import('@pacto-chat/ui-pages-login'),
		'PageLogin',
	),
	errorComponent: () => <CoPage componentName='login' error />,
	validateSearch: search => ({
		redirectTo: search.redirectTo as string | undefined,
	}),
})

export const routeLoginVerification = createRoute({
	getParentRoute: () => routeAuth,
	path: 'login-verification',
	component: lazyRouteComponent(
		() => import('@pacto-chat/ui-pages-login'),
		'PageLogin',
	),
	errorComponent: () => <CoPage componentName='login-verification' error />,
	validateSearch: search => ({
		email: search.email as string | undefined,
		redirectTo: search.redirectTo as string | undefined,
	}),
})

export const routeTree = routeRoot.addChildren([
	routeIndex,
	routeLayout.addChildren([routeLibrary, routeSettings]),
	routeAuth.addChildren([routeLogin, routeLoginVerification]),
])

// ================================
// Helpers
// ===============

/**
 * Maps a URL path to its corresponding TanStack Router path with language parameter.
 *
 * @param path - The current URL path without language
 * @returns The TanStack Router path with $lang parameter
 *
 * @example
 * getRoutePath('/settings') // returns '/$lang/settings'
 * getRoutePath('/library') // returns '/$lang/library'
 * getRoutePath('/') // returns '/$lang'
 */
const getRoutePath = (
	path: string,
): '/$lang' | '/$lang/library' | '/$lang/settings' => {
	// Remove leading slash for matching
	const cleanPath = path.startsWith('/') ? path.slice(1) : path

	// Map paths to route keys
	const pathToRouteKey: Record<string, RouteKey> = {
		'': 'root',
		library: 'library',
		settings: 'settings',
	}

	const routeKey = pathToRouteKey[cleanPath]
	if (!routeKey) return '/$lang' // Fallback to root

	// Get the route path from the routes object
	const route = routes[routeKey]
	// Remove the :lang parameter and replace with $lang for TanStack Router
	const routePath = route.path.replace(':lang', '$lang') as
		| '/$lang'
		| '/$lang/library'
		| '/$lang/settings'

	return routePath
}
