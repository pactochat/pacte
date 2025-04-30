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
	CoParagraph,
	CoText,
} from '@pacto-chat/shared-ui-core/components'
import { useTranslation } from '@pacto-chat/shared-ui-localization'
import { logExpoPagesSettings } from '@pacto-chat/shared-utils-logging'
import { ButtonSignOut, CoThemeSelector } from '~components'

export default function Settings() {
	const router = useRouter()
	const { user, isLoaded } = useUser()
	const { t } = useTranslation()
	const [isDeleting, setIsDeleting] = useState(false)

	const updateLanguage = async (
		language: keyof typeof ListSupportedLanguagesCodes,
	) => {
		try {
			if (!user) return

			await user.update({
				unsafeMetadata: {
					language,
				},
			})

			showMessage({
				message: t('pages.settings.account.language_updated'),
				type: 'success',
			})
		} catch (error) {
			logExpoPagesSettings.error('Error updating language', { error })
			showMessage({
				message: t('pages.settings.account.language_update_failed'),
				type: 'danger',
			})
		}
	}

	const handleDeleteAccount = async () => {
		if (!user?.deleteSelfEnabled) return

		try {
			setIsDeleting(true)
			await user.delete()
			router.replace('/')
		} catch (error) {
			logExpoPagesSettings.error('Error deleting account:', error)
			showMessage({
				message: t('pages.settings.account.delete_failed'),
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
				message: t('pages.settings.account.sessions_revoked'),
				type: 'success',
			})
		} catch (error) {
			logExpoPagesSettings.error('Error revoking sessions:', error)
			showMessage({
				message: t('pages.settings.account.sessions_revoke_failed'),
				type: 'danger',
			})
		}
	}

	if (!isLoaded || !user) {
		return <CoPage title={t('pages.settings.title')} />
	}

	const currentLanguage =
		(user.publicMetadata
			?.language as keyof typeof ListSupportedLanguagesCodes) || 'eng'
	const primaryEmail = user.primaryEmailAddress?.emailAddress
	const hasVerifiedEmail = user.hasVerifiedEmailAddress
	const lastSignIn = user.lastSignInAt
		? format(new Date(user.lastSignInAt.toString()), 'PPpp')
		: t('pages.settings.account.never')
	const createdAt = user.createdAt
		? format(new Date(user.createdAt.toString()), 'PPpp')
		: t('pages.settings.account.never')
	const updatedAt = user.updatedAt
		? format(new Date(user.updatedAt.toString()), 'PPpp')
		: t('pages.settings.account.never')

	return (
		<CoPage title={t('pages.settings.title')}>
			<YStack gap='$gapLg'>
				<CoCard>
					<CoCard.Title>{t('pages.settings.appearance.title')}</CoCard.Title>
					<CoCard.Content>
						<YStack gap='$gapMd'>
							<CoThemeSelector />
						</YStack>
					</CoCard.Content>
				</CoCard>

				<CoCard>
					<CoCard.Title>{t('pages.settings.account.title')}</CoCard.Title>
					<CoCard.Content>
						<YStack gap='$gapMd'>
							<YStack gap='$gapSm'>
								<CoText fontWeight='bold'>
									{t('pages.settings.account.language')}
								</CoText>
								<XStack gap='$gapSm'>
									<CoButtonText
										variant='outlined'
										fullWidth
										onPress={() => updateLanguage('eng')}
										disabled={currentLanguage === 'eng'}
									>
										English
									</CoButtonText>
									<CoButtonText
										variant='outlined'
										fullWidth
										onPress={() => updateLanguage('spa')}
										disabled={currentLanguage === 'spa'}
									>
										Español
									</CoButtonText>
									<CoButtonText
										variant='outlined'
										fullWidth
										onPress={() => updateLanguage('cat')}
										disabled={currentLanguage === 'cat'}
									>
										Català
									</CoButtonText>
								</XStack>
							</YStack>

							<YStack gap='$gapSm'>
								<CoText fontWeight='bold'>
									{t('pages.settings.account.email')}
								</CoText>
								<CoParagraph>{primaryEmail}</CoParagraph>
								<CoText color={hasVerifiedEmail ? '$success' : '$warning'}>
									{hasVerifiedEmail
										? t('pages.settings.account.email_verified')
										: t('pages.settings.account.email_not_verified')}
								</CoText>
							</YStack>

							<YStack gap='$gapSm'>
								<CoText fontWeight='bold'>
									{t('pages.settings.account.last_sign_in')}
								</CoText>
								<CoParagraph>{lastSignIn}</CoParagraph>
							</YStack>

							<YStack gap='$gapSm'>
								<CoText fontWeight='bold'>
									{t('pages.settings.account.created_at')}
								</CoText>
								<CoParagraph>{createdAt}</CoParagraph>
							</YStack>

							<YStack gap='$gapSm'>
								<CoText fontWeight='bold'>
									{t('pages.settings.account.updated_at')}
								</CoText>
								<CoParagraph>{updatedAt}</CoParagraph>
							</YStack>

							<YStack gap='$gapSm'>
								<CoButtonText
									variant='outlined'
									fullWidth
									onPress={handleSignOutAllSessions}
								>
									{t('pages.settings.account.sign_out_all_sessions')}
								</CoButtonText>
							</YStack>

							<YStack gap='$gapSm'>
								<ButtonSignOut variant='outlined' fullWidth />
							</YStack>

							{user.deleteSelfEnabled && (
								<YStack gap='$gapSm'>
									<CoButtonText
										variant='outlined'
										fullWidth
										onPress={handleDeleteAccount}
										disabled={isDeleting}
									>
										{t('pages.settings.account.delete_account')}
									</CoButtonText>
								</YStack>
							)}
						</YStack>
					</CoCard.Content>
				</CoCard>
			</YStack>
		</CoPage>
	)
}
