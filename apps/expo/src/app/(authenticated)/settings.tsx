import { useUser } from '@clerk/clerk-expo'
import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import React from 'react'
import { showMessage } from 'react-native-flash-message'
import { XStack, YStack } from 'tamagui'

import type { ListSupportedLanguagesCodes } from '@pacto-chat/shared-domain'
import {
	CoButtonText,
	CoCard,
	CoPage,
	CoText,
} from '@pacto-chat/shared-ui-core/components'
import { useTranslation } from '@pacto-chat/shared-ui-localization'
import { logExpoPagesSettings } from '@pacto-chat/shared-utils-logging'
import {
	CoButtonSignOut,
	CoLanguageSelector,
	CoThemeSelector,
} from '~components'

export default function Settings() {
	const router = useRouter()
	const { user, isLoaded } = useUser()
	const { t } = useTranslation()
	const [isDeleting, setIsDeleting] = useState(false)

	const handleDeleteAccount = async () => {
		if (!user?.deleteSelfEnabled) return

		try {
			setIsDeleting(true)
			await user.delete()
			router.replace('/')
		} catch (error) {
			logExpoPagesSettings.error('Error deleting account:', error)
			showMessage({
				message: t('pages.settings.account.msg.delete_failed'),
				type: 'danger',
			})
		} finally {
			setIsDeleting(false)
		}
	}

	const handleSignOutAllSessions = async () => {
		try {
			const sessions = await user?.getSessions()
			if (!sessions) return

			await Promise.all(sessions.map(session => session.revoke()))
			showMessage({
				message: t('pages.settings.account.msg.sessions_revoke_success'),
				type: 'success',
			})
		} catch (error) {
			logExpoPagesSettings.error('Error revoking sessions:', error)
			showMessage({
				message: t('pages.settings.account.msg.sessions_revoke_failed'),
				type: 'danger',
			})
		}
	}

	if (!isLoaded || !user) {
		return <CoPage title={t('pages.settings.title')} />
	}

	const currentLanguage =
		(user.unsafeMetadata?.language as
			| ListSupportedLanguagesCodes
			| 'auto'
			| undefined) || 'auto'
	const primaryEmail = user.primaryEmailAddress?.emailAddress
	const hasVerifiedEmail = user.hasVerifiedEmailAddress
	const lastSignIn = user.lastSignInAt
		? format(new Date(user.lastSignInAt.toString()), 'PPpp')
		: t('pages.settings.account.never')
	const createdAt = user.createdAt
		? format(new Date(user.createdAt.toString()), 'PPpp')
		: t('pages.settings.account.never')

	return (
		<CoPage title={t('pages.settings.title')}>
			<YStack gap='$gapLg'>
				<CoCard>
					<CoCard.Title>{t('pages.settings.appearance.title')}</CoCard.Title>
					<CoCard.Content>
						<CoThemeSelector />
					</CoCard.Content>
				</CoCard>

				<CoCard>
					<CoCard.Title>{t('pages.settings.account.title')}</CoCard.Title>
					<CoCard.Content>
						<YStack gap='$gapLg'>
							<CoLanguageSelector
								user={user}
								currentLanguage={currentLanguage}
							/>

							<YStack gap='$gapSm'>
								<CoText fontWeight='bold'>
									{t('pages.settings.account.email')}
								</CoText>
								<XStack gap='$gapSm'>
									<CoText>{primaryEmail}</CoText>
									<CoText>
										{hasVerifiedEmail
											? t('pages.settings.account.email_verified')
											: t('pages.settings.account.email_not_verified')}
									</CoText>
								</XStack>
							</YStack>

							<YStack gap='$gapSm'>
								<CoText fontWeight='bold'>
									{t('pages.settings.account.last_sign_in')}
								</CoText>
								<CoText>{lastSignIn}</CoText>
							</YStack>

							<YStack gap='$gapSm'>
								<CoText fontWeight='bold'>
									{t('pages.settings.account.created_at')}
								</CoText>
								<CoText>{createdAt}</CoText>
							</YStack>

							<YStack gap='$gapXs'>
								<CoButtonSignOut />

								<CoButtonText
									outlined
									fullWidth
									onPress={handleSignOutAllSessions}
								>
									{t('pages.settings.account.btn.sign_out_all_sessions')}
								</CoButtonText>

								{user.deleteSelfEnabled && (
									<CoButtonText
										outlined
										fullWidth
										onPress={handleDeleteAccount}
										disabled={isDeleting}
									>
										{t('pages.settings.account.btn.delete_account')}
									</CoButtonText>
								)}
							</YStack>
						</YStack>
					</CoCard.Content>
				</CoCard>
			</YStack>
		</CoPage>
	)
}
