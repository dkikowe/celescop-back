export class ApiError extends Error {
	status: number

	constructor(status: number, message: string) {
		super(message)
		this.status = status
		this.message = message
		Object.setPrototypeOf(this, ApiError.prototype)
	}
}
