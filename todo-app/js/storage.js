const STORAGE_KEY = 'task_master_data'
const FILTER_KEY = 'task_master_filter'

// LocalStorage: Загрузка и сохранение задач (постоянное хранение)
export const loadTasks = () => {
	const data = localStorage.getItem(STORAGE_KEY)
	return data ? JSON.parse(data) : []
}

export const saveTasks = tasks => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

// SessionStorage: Загрузка и сохранение фильтра (хранение на время сессии)
export const loadFilter = () => sessionStorage.getItem(FILTER_KEY) || 'all'

export const saveFilter = filter => {
	sessionStorage.setItem(FILTER_KEY, filter)
}
