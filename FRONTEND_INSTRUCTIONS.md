# Инструкции для фронтенда - Удаление системы пинкодов

## Обзор изменений

Система пинкодов полностью удалена из бэкенда. Теперь аутентификация происходит только через Telegram WebApp данные без дополнительной проверки пинкода.

## Изменения в API

### 1. Эндпоинт аутентификации `/auth/telegram`

**Было:**

```json
{
	"initData": {
		"user": {
			"id": 123456789,
			"first_name": "Иван",
			"last_name": "Иванов",
			"username": "ivan_ivanov",
			"photo_url": "https://t.me/i/userpic/320/..."
		},
		"auth_date": 1640995200,
		"hash": "...",
		"signature": "..."
	},
	"pin": "1234"
}
```

**Стало:**

```json
{
	"initData": {
		"user": {
			"id": 123456789,
			"first_name": "Иван",
			"last_name": "Иванов",
			"username": "ivan_ivanov",
			"photo_url": "https://t.me/i/userpic/320/..."
		},
		"auth_date": 1640995200,
		"hash": "...",
		"signature": "..."
	}
}
```

### 2. Эндпоинт редактирования пользователя `/user/edit`

**Было:**

```json
{
	"username": "new_username",
	"firstName": "Новое имя",
	"lastName": "Новая фамилия",
	"pin": "5678"
}
```

**Стало:**

```json
{
	"username": "new_username",
	"firstName": "Новое имя",
	"lastName": "Новая фамилия"
}
```

## Что нужно изменить на фронтенде

### 1. Удалить поля пинкода из форм

- Убрать поля ввода пинкода из формы аутентификации
- Убрать поля ввода пинкода из формы редактирования профиля
- Удалить валидацию пинкода

### 2. Обновить запросы к API

- Убрать поле `pin` из запроса к `/auth/telegram`
- Убрать поле `pin` из запроса к `/user/edit`

### 3. Обновить типы TypeScript (если используются)

```typescript
// Удалить из интерфейса аутентификации
interface AuthRequest {
	initData: InitData
	// pin: string; // УДАЛИТЬ
}

// Удалить из интерфейса редактирования пользователя
interface UserEditRequest {
	username?: string
	firstName?: string
	lastName?: string
	// pin?: string; // УДАЛИТЬ
}
```

### 4. Обновить UI/UX

- Убрать экраны ввода пинкода
- Упростить процесс аутентификации - теперь только через Telegram WebApp
- Обновить тексты и подсказки, убрав упоминания пинкода

### 5. Обновить валидацию

- Удалить валидацию пинкода из форм
- Обновить схемы валидации (если используются библиотеки типа Yup, Zod и т.д.)

## Пример обновленного кода аутентификации

**Было:**

```javascript
const authenticateUser = async (initData, pin) => {
	const response = await fetch('/auth/telegram', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			initData,
			pin
		})
	})
	return response.json()
}
```

**Стало:**

```javascript
const authenticateUser = async initData => {
	const response = await fetch('/auth/telegram', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			initData
		})
	})
	return response.json()
}
```

## Важные замечания

1. **Безопасность**: Аутентификация теперь полностью полагается на Telegram WebApp данные. Убедитесь, что `initData` правильно валидируется на фронтенде.

2. **Обратная совместимость**: Старые пользователи, у которых был пинкод в базе данных, смогут войти без пинкода. Поле `pin` будет игнорироваться.

3. **Миграция данных**: После применения миграции базы данных поле `pin` будет удалено из таблицы `User`.

4. **Тестирование**: Протестируйте все сценарии аутентификации и редактирования профиля.

## Миграция базы данных

После обновления кода необходимо применить миграцию базы данных:

```bash
npx prisma migrate deploy
```

Или если используете dev окружение:

```bash
npx prisma migrate dev
```

Это удалит поле `pin` из таблицы `User` в базе данных.
