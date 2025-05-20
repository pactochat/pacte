import type { UserResource } from '@clerk/types'
import { useState } from 'react'
import { showMessage } from 'react-native-flash-message'
import { XStack, YStack } from 'tamagui'

import type { ListSupportedLanguagesCodes } from '@aipacto/shared-domain'
import { CoButtonText, CoText } from '@aipacto/shared-ui-core/components'
import { changeLanguage, useTranslation } from '@aipacto/shared-ui-localization'
import { logExpoPagesSettings } from '@aipacto/shared-utils-logging'

export const CoLanguageSelector = ({
	user,
	currentLanguage = 'auto',
}: {
	user: UserResource
	currentLanguage?: ListSupportedLanguagesCodes | 'auto'
}) => {
	const { t } = useTranslation()
	const [isUpdating, setIsUpdating] = useState(false)

	const updateLanguage = async (
		language: ListSupportedLanguagesCodes | 'auto',
	) => {
		if (isUpdating || !user) return

		try {
			setIsUpdating(true)

			// Update in Clerk's unsafeMetadata
			await user.update({
				unsafeMetadata: {
					...user.unsafeMetadata,
					language: language === 'auto' ? undefined : language,
				},
			})

			// Then update the app's i18n instance
			await changeLanguage(language)

			showMessage({
				message: t('pages.settings.account.msg.language_success'),
				type: 'success',
			})
		} catch (error) {
			logExpoPagesSettings.error('Error updating language', { error })
			showMessage({
				message: t('pages.settings.account.msg.language_failed'),
				type: 'danger',
			})
		} finally {
			setIsUpdating(false)
		}
	}

	const languageNames = {
		auto: t('languages.automatic'),
		eng: t('languages.english'),
		spa: t('languages.spanish'),
		cat: t('languages.catalan'),
	}

	return (
		<YStack gap='$gapSm'>
			<CoText fontWeight='bold'>{t('pages.settings.account.language')}</CoText>
			<XStack flexDirection='row' gap='$gapSm' flexWrap='wrap'>
				<XStack flex={1} minWidth={100}>
					<CoButtonText
						outlined
						fullWidth
						onPress={() => updateLanguage('auto')}
						disabled={currentLanguage === 'auto' || isUpdating}
						aria-selected={currentLanguage === 'auto'}
					>
						{languageNames.auto}
					</CoButtonText>
				</XStack>
				<XStack flex={1} minWidth={100}>
					<CoButtonText
						outlined
						fullWidth
						onPress={() => updateLanguage('eng')}
						disabled={currentLanguage === 'eng' || isUpdating}
						aria-selected={currentLanguage === 'eng'}
					>
						{languageNames.eng}
					</CoButtonText>
				</XStack>
				<XStack flex={1} minWidth={100}>
					<CoButtonText
						outlined
						fullWidth
						onPress={() => updateLanguage('spa')}
						disabled={currentLanguage === 'spa' || isUpdating}
						aria-selected={currentLanguage === 'spa'}
					>
						{languageNames.spa}
					</CoButtonText>
				</XStack>
				<XStack flex={1} minWidth={100}>
					<CoButtonText
						outlined
						fullWidth
						onPress={() => updateLanguage('cat')}
						disabled={currentLanguage === 'cat' || isUpdating}
						aria-selected={currentLanguage === 'cat'}
					>
						{languageNames.cat}
					</CoButtonText>
				</XStack>
			</XStack>
		</YStack>
	)
}
