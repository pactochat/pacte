import { useRouter } from 'expo-router'
import { useState } from 'react'
import React from 'react'
import { ScrollView, XStack, YStack } from 'tamagui'

import {
	CoButtonIcon,
	CoPage,
	CoText,
	CoTextField,
} from '@aipacto/shared-ui-core/components'
import { IconSend } from '@aipacto/shared-ui-core/icons'
import { CoProfile } from '~components'

export default function ChatHome() {
	const router = useRouter()

	const [message, setMessage] = useState('')
	const [messages, setMessages] = useState<string[]>([])

	const handleSend = () => {
		if (message.trim()) {
			setMessages([...messages, message])
			setMessage('')
		}
	}

	const handleProfilePress = () => {
		router.push('/settings')
	}

	return (
		<CoPage narrow='big'>
			<CoProfile onPress={handleProfilePress} />

			{/* Message Area */}
			<ScrollView style={{ flex: 1 }}>
				<YStack gap='$gapMd' flex={1} justifyContent='flex-end'>
					{messages.length === 0 ? (
						<YStack flex={1} justifyContent='center' alignItems='center'>
							<CoText display-m>Welcome to Pacto Chat</CoText>
							<CoText>Start typing to chat with our AI</CoText>
						</YStack>
					) : (
						messages.map((msg, index) => <CoText key={index}>{msg}</CoText>)
					)}
				</YStack>
			</ScrollView>

			{/* Input Area */}
			<XStack
				paddingHorizontal='$spacingSm'
				paddingVertical='$spacingMd'
				gap='$gapSm'
				alignItems='center'
			>
				<CoTextField
					value={message}
					onChangeText={setMessage}
					placeholder='Type your message...'
					flex={1}
					onSubmitEditing={handleSend}
				/>
				<CoButtonIcon
					icon={IconSend}
					filled
					onPress={handleSend}
					disabled={!message.trim()}
				/>
			</XStack>
		</CoPage>
	)
}
