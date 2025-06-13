// Order of services is important for the Docker services to start in the correct order
export const services = {
	// email: '../../services/email',
	// db_marketing: '../../services/db_marketing',
	authz: '../../services/authz',
	db: '../../services/db',
	sync: '../../services/sync',
} as const
