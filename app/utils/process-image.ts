import sharp from 'sharp'
import heicConvert from 'heic-convert'
import { ApiError } from './api-error'

/**
 * Обрабатывает изображение любого формата и конвертирует в JPEG
 * Поддерживает: JPEG, PNG, WebP, HEIC, HEIF, GIF, TIFF, AVIF, SVG и другие
 * 
 * @param fileBuffer - Буфер с изображением
 * @param mimetype - MIME-тип изображения (опционально)
 * @returns Обработанный буфер в формате JPEG
 */
/**
 * Определяет реальный формат файла по магическим байтам
 */
function detectFileFormat(buffer: Buffer): string | null {
	if (buffer.length < 4) return null;
	
	const header = buffer.slice(0, 12);
	const hex = header.toString('hex').toUpperCase();
	
	// JPEG: FF D8 FF
	if (hex.startsWith('FFD8FF')) return 'jpeg';
	
	// PNG: 89 50 4E 47
	if (hex.startsWith('89504E47')) return 'png';
	
	// GIF: 47 49 46 38
	if (hex.startsWith('47494638')) return 'gif';
	
	// WebP: RIFF...WEBP
	if (hex.startsWith('52494646') && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
	
	// HEIC/HEIF: ftyp...heic или ftyp...mif1
	if (hex.includes('66747970')) {
		const ascii = buffer.toString('ascii', 4, 12);
		if (ascii.includes('heic') || ascii.includes('mif1')) return 'heic';
	}
	
	// TIFF: 49 49 2A 00 или 4D 4D 00 2A
	if (hex.startsWith('49492A00') || hex.startsWith('4D4D002A')) return 'tiff';
	
	return null;
}

export async function processImageBuffer(fileBuffer: Buffer, mimetype?: string): Promise<Buffer> {
	let imageBuffer = fileBuffer;
	
	console.log('[processImage] ===== Начало обработки изображения =====');
	console.log('[processImage] Mimetype:', mimetype);
	console.log('[processImage] Buffer size:', fileBuffer.length, 'bytes');
	console.log('[processImage] First 20 bytes (hex):', fileBuffer.slice(0, 20).toString('hex'));
	
	// Определяем реальный формат по магическим байтам
	const realFormat = detectFileFormat(fileBuffer);
	console.log('[processImage] Real format detected:', realFormat);
	
	if (realFormat && mimetype && !mimetype.toLowerCase().includes(realFormat)) {
		console.warn('[processImage] ⚠️ WARNING: MIME type mismatch! MIME:', mimetype, 'Real format:', realFormat);
	}
	
	// Пробуем определить формат через Sharp
	let detectedFormat: string | undefined;
	try {
		const metadata = await sharp(fileBuffer).metadata();
		detectedFormat = metadata.format;
		console.log('[processImage] Sharp metadata:', { format: detectedFormat, width: metadata.width, height: metadata.height });
		
		// Если формат HEIF/HEIC (определён через Sharp или по магическим байтам), конвертируем в JPEG через heic-convert
		if (detectedFormat === 'heif' || detectedFormat === 'heic' || realFormat === 'heic') {
			console.log('[processImage] Detected HEIF/HEIC format, converting to JPEG');
			try {
				const converted = await heicConvert({
					buffer: fileBuffer,
					format: 'JPEG',
					quality: 0.9
				});
				imageBuffer = Buffer.from(converted);
				console.log('[processImage] HEIC conversion successful, new size:', imageBuffer.length);
			} catch (heicError: any) {
				console.log('[processImage] HEIC conversion failed, trying Sharp:', heicError.message);
				// Если heic-convert не сработал, пробуем Sharp (может поддерживать в зависимости от сборки)
				imageBuffer = fileBuffer;
			}
		}
	} catch (metadataError: any) {
		console.log('[processImage] Sharp metadata failed:', metadataError.message);
		
		// Если mimetype указывает на HEIC/HEIF, реальный формат HEIC, или Sharp не смог распознать, пробуем HEIC конвертацию
		if (mimetype?.toLowerCase().includes('heic') || mimetype?.toLowerCase().includes('heif') || realFormat === 'heic') {
			try {
				console.log('[processImage] Attempting HEIC conversion as fallback based on mimetype');
				const converted = await heicConvert({
					buffer: fileBuffer,
					format: 'JPEG',
					quality: 0.9
				});
				imageBuffer = Buffer.from(converted);
				console.log('[processImage] Fallback HEIC conversion successful, new size:', imageBuffer.length);
			} catch (heicError: any) {
				console.log('[processImage] HEIC conversion also failed:', heicError.message);
				// Если и HEIC конвертация не помогла, пробуем обработать через Sharp как есть
				imageBuffer = fileBuffer;
			}
		}
	}

	// Финальная обработка через Sharp - конвертируем все форматы в JPEG
	// Sharp автоматически поддерживает: JPEG, PNG, WebP, GIF, SVG, TIFF, AVIF, HEIF (если скомпилирован с поддержкой)
	try {
		// Для JPEG файлов пробуем сначала без дополнительных опций, чтобы избежать проблем
		if (detectedFormat === 'jpeg' || detectedFormat === 'jpg' || realFormat === 'jpeg' || mimetype?.toLowerCase().includes('jpeg') || mimetype?.toLowerCase().includes('jpg')) {
			console.log('[processImage] JPEG detected, trying simple conversion first');
			try {
				const processedBuffer = await sharp(imageBuffer)
					.rotate() // Автоповорот по EXIF
					.jpeg({ 
						quality: 90
					})
					.toBuffer();
				
				console.log('[processImage] Sharp JPEG processing successful, final size:', processedBuffer.length);
				return processedBuffer;
			} catch (jpegError: any) {
				console.log('[processImage] Simple JPEG conversion failed, trying with mozjpeg:', jpegError.message);
				// Если простая конвертация не сработала, пробуем с mozjpeg
			}
		}
		
		// Стандартная обработка для всех форматов
		const processedBuffer = await sharp(imageBuffer)
			.rotate() // Автоповорот по EXIF
			.jpeg({ 
				quality: 90, 
				mozjpeg: true,
				progressive: true
			})
			.toBuffer();
		
		console.log('[processImage] ✅ Sharp processing successful, final size:', processedBuffer.length);
		console.log('[processImage] ===== Обработка изображения завершена успешно =====');
		return processedBuffer;
	} catch (sharpError: any) {
		console.error('[processImage] ❌ Sharp final processing failed');
		console.error('[processImage] Error message:', sharpError.message);
		console.error('[processImage] Error code:', sharpError.code);
		console.error('[processImage] Error stack:', sharpError.stack);
		console.error('[processImage] Error details:', {
			message: sharpError.message,
			code: sharpError.code,
			mimetype,
			detectedFormat,
			realFormat,
			bufferSize: imageBuffer.length
		});
		
		// Если это JPEG и Sharp не смог обработать, пробуем вернуть как есть (если размер разумный)
		if ((detectedFormat === 'jpeg' || detectedFormat === 'jpg' || realFormat === 'jpeg' || mimetype?.toLowerCase().includes('jpeg')) && imageBuffer.length < 10 * 1024 * 1024) {
			console.log('[processImage] JPEG processing failed, returning original buffer as fallback');
			return imageBuffer;
		}
		
		// Если Sharp не смог обработать, пробуем определить формат по mimetype и дать более понятную ошибку
		const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/tiff', 'image/avif'];
		const isSupportedMimeType = mimetype && supportedFormats.some(format => mimetype.toLowerCase().includes(format.replace('image/', '')));
		
		if (!isSupportedMimeType && mimetype) {
			throw new ApiError(400, `Неподдерживаемый формат изображения: ${mimetype}. Поддерживаются: JPEG, PNG, WebP, HEIC, HEIF, GIF, TIFF, AVIF`);
		}
		
		throw new ApiError(400, `Не удалось обработать изображение: ${sharpError.message}. Проверьте формат и размер файла.`);
	}
}

