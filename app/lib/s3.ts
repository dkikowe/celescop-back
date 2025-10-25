import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
	region: process.env.REGION!,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY!,
		secretAccessKey: process.env.AWS_SECRET_KEY!
	}
})

export const uploadFile = async (file: Buffer, fileName: string) => {
	const command = new PutObjectCommand({
		Bucket: process.env.AWS_BUCKET_NAME!,
		Key: fileName,
		Body: file,
		ContentType: 'image/jpeg'
	})

	await s3.send(command)
	return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`
}

export const deleteFile = async (fileName: string) => {
	const params = {
		Bucket: process.env.AWS_BUCKET_NAME!,
		Key: fileName
	}

	try {
		const command = new DeleteObjectCommand(params)
		await s3.send(command)
	} catch (err) {
		console.error('Error deleting file from S3:', err)
		throw new Error('Error deleting file')
	}
}
