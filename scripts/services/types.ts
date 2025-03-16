// Order of services is important for the Docker services to start in the correct order
export const services = {
	email: '../../services/email',
	db: '../../services/db',
	auth: '../../services/auth'
} as const
