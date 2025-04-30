import { useAuth } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import Head from 'expo-router/head'
import { useState } from 'react'
import React from 'react'
import { ScrollView, XStack, YStack } from 'tamagui'

import {
	CoButtonIcon,
	CoPage,
	CoText,
	CoTextField,
} from '@pacto-chat/shared-ui-core/components'
import { IconLogOut, IconSend } from '@pacto-chat/shared-ui-core/icons'
import { CoProfile } from '../../components'

export default function ChatHome() {
	const [message, setMessage] = useState('')
	const [messages, setMessages] = useState<string[]>([])
	const router = useRouter()
	const { signOut } = useAuth()

	const handleSend = () => {
		if (message.trim()) {
			setMessages([...messages, message])
			setMessage('')
		}
	}

	const handleLogout = async () => {
		await signOut()
		router.replace('/auth')
	}

	const handleProfilePress = () => {
		router.push('/settings')
	}

	return (
		<>
			<Head>
				<title>Pacto Chat</title>
			</Head>
			<CoPage narrow='big'>
				{/* Header with Profile and Logout */}
				<XStack
					justifyContent='space-between'
					paddingHorizontal='$spacingSm'
					paddingVertical='$spacingXs'
					alignItems='center'
				>
					<CoProfile onPress={handleProfilePress} />

					<CoButtonIcon icon={IconLogOut} standard onPress={handleLogout} />
				</XStack>

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
		</>
	)
}
