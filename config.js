require('dotenv').config()

module.exports = {
	NODE_ENV: process.env.NODE_ENV || 'local',
	HOST: process.env.HOST || 'localhost',
	PORT: process.env.PORT || 3000,
	AUTHENTICATION_EMULATOR_HOST: process.env.AUTHENTICATION_EMULATOR_HOST || 'http://localhost:9099',
	DATABASE_URL: process.env.DATABASE_URL || 'http://localhost:9000',
	DATABASE_INSTANCE: process.env.DATABASE_INSTANCE || 'gorda-driver',
	DATABASE_EMULATOR_HOST: process.env.DATABASE_EMULATOR_HOST || 'http://localhost',
	DATABASE_EMULATOR_PORT: process.env.DATABASE_EMULATOR_PORT || 9000,
	STORAGE_EMULATOR_HOST: process.env.STORAGE_EMULATOR_HOST || 'http://localhost:9199',
	GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
}
