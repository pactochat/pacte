import {
	CardFrame,
	CardHeader,
	type TextProps,
	XStack,
	YStack,
	styled,
	withStaticProperties,
} from 'tamagui'

import { useTranslation } from '@pacto-chat/shared-ui-localization'
import { CoSpinner } from './co_spinner'
import { CoText } from './co_text'

const CardContainer = styled(CardFrame, {
	name: 'CoCard',

	backgroundColor: '$surfaceContainer',
	borderRadius: '$roundedMd',
	padding: '$spacingSm',
	paddingBottom: '$spacingMd',
	unstyled: true,
	$gtXs: {
		padding: '$spacingMd',
		paddingBottom: '$spacingLg',
	},
	$gtXl: {
		padding: '$spacingLg',
		paddingBottom: '$spacingXl',
	},
})

interface CoCardHeaderProps extends TextProps {
	children: string
}

const CoCardHeader = ({ children, ...props }: CoCardHeaderProps) => (
	<CardHeader marginBottom='$spacingMd' paddingTop={0}>
		<CoText fontFamily='$heading' headline-m {...props}>
			{children}
		</CoText>
	</CardHeader>
)

interface CoCardContentProps {
	children: React.ReactNode
	loading?: string | boolean | undefined
}

const CoCardContent = ({ children, loading }: CoCardContentProps) => {
	const { t } = useTranslation()

	const StyledContent = styled(YStack, {
		name: 'CoCardContent',
		gap: '$gapMd',
	})

	if (loading) {
		return (
			<StyledContent
				alignItems='center'
				justifyContent='center'
				paddingVertical='$spacingLg'
			>
				<XStack alignItems='center' gap='$gapSm'>
					<CoSpinner size='small' />
					<CoText>
						{typeof loading === 'string' ? loading : t('misc.txt.loading')}
					</CoText>
				</XStack>
			</StyledContent>
		)
	}

	return <StyledContent>{children}</StyledContent>
}

export const CoCard = withStaticProperties(CardContainer, {
	Title: CoCardHeader,
	Content: CoCardContent,
})
