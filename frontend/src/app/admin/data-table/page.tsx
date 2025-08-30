import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

import TaskPageClient from './task-page-client'
import { taskSchema } from '@/components/data-table/data/schema'
// Simulate a database read for tasks.
async function getTasks() {
    const data = await fs.readFile(
        path.join(
            process.cwd(),
            'src',
            'components',
            'data-table',
            'data',
            'tasks.json',
        ),
    )

    const tasks = JSON.parse(data.toString())

    return z.array(taskSchema).parse(tasks)
}

export default async function TaskPage() {
    const tasks = await getTasks()

    return <TaskPageClient tasks={tasks} />
}
