export interface InitData {
	auth_date: Date
	can_send_after?: number
	chat?: any
	chat_type?: any
	chat_instance?: string
	hash: string
	query_id?: string
	receiver?: User
	start_param?: string
	signature: string
	user?: User
}

export interface User {
	added_to_attachment_menu?: boolean
	allows_write_to_pm?: boolean
	first_name: string
	id: number
	is_bot?: boolean
	is_premium?: boolean
	last_name?: string
	language_code?: string
	photo_url?: string
	username?: string
}
