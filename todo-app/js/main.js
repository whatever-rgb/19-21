import { loadTasks, saveTasks, loadFilter, saveFilter } from './storage.js'
import {
	initializeTasks,
	getTasks,
	addTask,
	toggleTask,
	deleteTask,
	clearCompleted,
	getFilteredTasks,
	updatePriority,
} from './tasks.js'
import {
	fetchSampleTasks,
	createTaskOnServer,
	updateTaskOnServer,
	deleteTaskOnServer,
} from './api.js'

// Инициализация
let currentFilter = loadFilter()

// Получение DOM элементов
const taskForm = document.getElementById('taskForm')
const taskInput = document.getElementById('taskInput')
const prioritySelect = document.getElementById('prioritySelect')
const taskList = document.getElementById('taskList')
const filtersContainer = document.getElementById('filters')
const stats = document.getElementById('stats')
const loadSamplesBtn = document.getElementById('loadSamples')
const clearCompletedBtn = document.getElementById('clearCompleted')

// Загрузка данных при старте
initializeTasks(loadTasks())
renderTasks()

// Добавление задачи
taskForm.addEventListener('submit', async e => {
	e.preventDefault()
	const text = taskInput.value.trim()
	if (!text) return

	addTask(text, prioritySelect.value)

	try {
		await createTaskOnServer(text)
	} catch (err) {
		console.warn('Ошибка Fake API', err)
	}

	taskInput.value = ''
	prioritySelect.value = 'medium'
	saveAndRender()
})

// Делегирование событий (Клик по чекбоксу и кнопке удаления)
taskList.addEventListener('change', e => {
	if (e.target.type !== 'checkbox') return
	const li = e.target.closest('li')
	if (!li) return

	const id = li.dataset.id
	toggleTask(id)

	const task = getTasks().find(t => t.id === id)
	if (task)
		updateTaskOnServer(id.replace('server-', ''), task.completed).catch(
			() => {}
		)

	saveAndRender()
})

taskList.addEventListener('click', e => {
	if (!e.target.closest('.delete-btn')) return
	const li = e.target.closest('li')
	if (!li) return

	const id = li.dataset.id
	deleteTask(id)
	deleteTaskOnServer(id.replace('server-', '')).catch(() => {})
	saveAndRender()
})

// Двойной клик для смены приоритета
taskList.addEventListener('dblclick', e => {
	if (e.target.type === 'checkbox' || e.target.closest('.delete-btn')) return

	const li = e.target.closest('li')
	if (!li) return

	const taskTextElement = li.querySelector('.task-text')
	const task = getTasks().find(t => t.id === li.dataset.id)

	if (task && taskTextElement) startPriorityEdit(task, li, taskTextElement)
})

// Фильтрация
filtersContainer.addEventListener('click', e => {
	if (!e.target.dataset.filter) return

	currentFilter = e.target.dataset.filter
	saveFilter(currentFilter)

	document.querySelectorAll('.filter-btn').forEach(btn => {
		btn.classList.toggle('active', btn.dataset.filter === currentFilter)
	})

	renderTasks()
})

// Загрузка с сервера (Fetch API)
loadSamplesBtn.addEventListener('click', async () => {
	loadSamplesBtn.disabled = true
	const originalHtml = loadSamplesBtn.innerHTML
	loadSamplesBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Загрузка...`

	try {
		const data = await fetchSampleTasks()
		const existingTexts = new Set(
			getTasks().map(t => t.text.toLowerCase().trim())
		)

		let addedCount = 0
		data.forEach(item => {
			const norm = item.title.toLowerCase().trim()
			if (!existingTexts.has(norm)) {
				const task = addTask(item.title, 'medium')
				task.completed = item.completed
				task.id = `server-${item.id}`
				existingTexts.add(norm)
				addedCount++
			}
		})

		alert(
			addedCount === 0
				? 'Все задачи уже загружены'
				: `Добавлено ${addedCount} задач!`
		)
		saveAndRender()
	} catch (err) {
		alert('Ошибка загрузки: ' + err.message)
	} finally {
		loadSamplesBtn.disabled = false
		loadSamplesBtn.innerHTML = originalHtml
	}
})

// Очистка выполненных
clearCompletedBtn.addEventListener('click', () => {
	if (confirm('Удалить все выполненные задачи?')) {
		clearCompleted()
		saveAndRender()
	}
})

// Вспомогательные функции

function saveAndRender() {
	saveTasks(getTasks())
	renderTasks()
}

function renderTasks() {
	const filteredTasks = getFilteredTasks(currentFilter)
	taskList.innerHTML = ''

	const priorityColors = {
		high: 'bg-rose-500',
		medium: 'bg-amber-400',
		low: 'bg-blue-400',
	}

	filteredTasks.forEach(task => {
		const li = document.createElement('li')
		li.dataset.id = task.id
		li.className =
			'group flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer'

		const priorityClass = priorityColors[task.priority] || 'bg-slate-400'

		li.innerHTML = `
            <div class="w-2 self-stretch ${priorityClass} shrink-0"></div>
            <div class="flex-1 flex items-center gap-4 p-4">
                <input type="checkbox" class="w-5 h-5 accent-indigo-600 cursor-pointer rounded" ${
									task.completed ? 'checked' : ''
								}>
                <div class="flex-1">
                    <span class="task-text text-slate-700 font-medium text-lg ${
											task.completed ? 'task-completed' : ''
										} transition-all">${task.text}</span>
                </div>
                <button class="delete-btn text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-2">
                    <i class="fas fa-trash-alt text-lg"></i>
                </button>
            </div>
        `
		taskList.appendChild(li)
	})

	const all = getTasks()
	stats.textContent = `${all.length} задач • ${
		all.filter(t => t.completed).length
	} выполнено`
}

function startPriorityEdit(task, li, taskTextElement) {
	const select = document.createElement('select')
	select.className =
		'ml-3 bg-slate-50 border border-indigo-300 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm'

	const options = [
		{ val: 'low', text: 'Низкий' },
		{ val: 'medium', text: 'Средний' },
		{ val: 'high', text: 'Высокий' },
	]

	options.forEach(opt => {
		const optionEl = document.createElement('option')
		optionEl.value = opt.val
		optionEl.textContent = opt.text
		if (task.priority === opt.val) optionEl.selected = true
		select.appendChild(optionEl)
	})

	taskTextElement.insertAdjacentElement('afterend', select)
	select.focus()

	const savePriority = () => {
		if (select.value !== task.priority) {
			updatePriority(task.id, select.value)
			saveAndRender()
		}
		select.remove()
	}

	select.addEventListener('change', savePriority)
	select.addEventListener('blur', savePriority)
	select.addEventListener('keydown', e => {
		if (e.key === 'Enter') {
			e.preventDefault()
			savePriority()
		}
		if (e.key === 'Escape') select.remove()
	})
}
