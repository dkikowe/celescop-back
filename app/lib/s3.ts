import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

let s3Client: S3Client | null = null

// Функция для получения или создания S3 клиента (ленивая инициализация)
function getS3Client(): S3Client {
	if (!s3Client) {
		// Проверяем наличие необходимых переменных окружения
		const AWS_REGION = process.env.AWS_REGION || process.env.REGION || 'eu-north-1'
		const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID
		const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY
		const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME

		if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY) {
			console.error('❌ AWS credentials are missing! Check AWS_ACCESS_KEY and AWS_SECRET_KEY environment variables')
			throw new Error('AWS credentials are not configured')
		}

		if (!AWS_BUCKET_NAME) {
			console.error('❌ AWS_BUCKET_NAME is missing!')
			throw new Error('AWS_BUCKET_NAME is not configured')
		}

		console.log('✅ S3 Client initialized with region:', AWS_REGION, 'bucket:', AWS_BUCKET_NAME)

		s3Client = new S3Client({
			region: AWS_REGION,
			credentials: {
				accessKeyId: AWS_ACCESS_KEY,
				secretAccessKey: AWS_SECRET_KEY
			}
		})
	}
	
	return s3Client
}

// Функция для получения конфигурации AWS
function getAWSConfig() {
	const AWS_REGION = process.env.AWS_REGION || process.env.REGION || 'eu-north-1'
	const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME
	
	if (!AWS_BUCKET_NAME) {
		throw new Error('AWS_BUCKET_NAME is not configured')
	}
	
	return { AWS_REGION, AWS_BUCKET_NAME }
}

export const uploadFile = async (file: Buffer, fileName: string) => {
	try {
		const s3 = getS3Client()
		const { AWS_REGION, AWS_BUCKET_NAME } = getAWSConfig()
		
		const command = new PutObjectCommand({
			Bucket: AWS_BUCKET_NAME,
			Key: fileName,
			Body: file,
			ContentType: 'image/jpeg'
		})

		await s3.send(command)
		const fileUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileName}`
		console.log('✅ File uploaded successfully:', fileUrl)
		return fileUrl
	} catch (error) {
		console.error('❌ S3 upload error:', error)
		throw error
	}
}

export const deleteFile = async (fileName: string) => {
	try {
		const s3 = getS3Client()
		const { AWS_BUCKET_NAME } = getAWSConfig()
		
		const params = {
			Bucket: AWS_BUCKET_NAME,
			Key: fileName
		}

		const command = new DeleteObjectCommand(params)
		await s3.send(command)
		console.log('✅ File deleted successfully:', fileName)
	} catch (err) {
		console.error('❌ Error deleting file from S3:', err)
		throw new Error('Error deleting file')
	}
}
