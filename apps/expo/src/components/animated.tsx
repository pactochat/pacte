import { SplashScreen } from 'expo-router'
import { useEffect } from 'react'
import React from 'react'
import { Animated, type ImageSourcePropType, StyleSheet } from 'react-native'

export function AnimatedSplashScreen({
	children,
	loading,
	image,
}: {
	children: React.ReactNode
	loading: boolean
	image: ImageSourcePropType
}) {
	const animation = React.useMemo(() => new Animated.Value(1), [])
	const [isSplashAnimationComplete, setAnimationComplete] =
		React.useState(false)

	useEffect(() => {
		if (!loading) {
			SplashScreen.hideAsync()

			Animated.timing(animation, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}).start(() => setAnimationComplete(true))
		}
	}, [animation, loading])

	if (process.env.EXPO_OS === 'web') {
		return children
	}

	return (
		<>
			{children}

			{!isSplashAnimationComplete && (
				<Animated.View
					style={[
						StyleSheet.absoluteFill,
						{
							backgroundColor: '#F09458',
							opacity: animation,
							pointerEvents: 'none',
						},
					]}
				>
					<Animated.Image
						style={{
							width: '100%',
							height: '100%',
							transform: [
								{
									scale: animation.interpolate({
										inputRange: [0, 1],
										outputRange: [2.5, 1],
									}),
								},
							],
						}}
						resizeMode='cover'
						source={image}
						fadeDuration={0}
					/>
				</Animated.View>
			)}
		</>
	)
}
