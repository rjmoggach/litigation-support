'use client'

import { PageHeader } from '@/components/admin/page-header'
import {
    createUserColumns,
    userRoleOptions,
    userStatusOptions,
} from '@/components/admin/users/user-columns'
import { UserEditDialog } from '@/components/admin/users/user-edit-dialog'
import { FlexibleDataTable } from '@/components/data-table/flexible-data-table'
import { Button } from '@/components/ui/button'
import {
    adminDeleteUserApiV1AdminUsersUserIdDelete,
    adminListUsersApiV1AdminUsersGet,
    adminUpdateUserApiV1AdminUsersUserIdPut,
} from '@/lib/api/sdk.gen'
import type { User } from '@/lib/api/types.gen'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { RefreshCw, UserPlus, Users } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
export default function UsersPage() {
    const { data: session } = useSession()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)

    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/admin' },
        { label: 'Users', active: true },
    ])

    // Fetch users from API
    const fetchUsers = useCallback(async () => {
        if (!session?.accessToken) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const response = await adminListUsersApiV1AdminUsersGet({
                query: {
                    per_page: 1000, // Get all users for client-side processing
                },
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            if (response.data) {
                setUsers(response.data.users || [])
            }
        } catch (error) {
            console.error('Failed to fetch users:', error)
            toast.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }, [session])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const handleUserEdit = useCallback((user: User) => {
        setSelectedUser(user)
        setEditDialogOpen(true)
    }, [])

    const handleUserSave = async (userId: number, data: any) => {
        if (!session?.accessToken) return

        try {
            await adminUpdateUserApiV1AdminUsersUserIdPut({
                path: { user_id: userId },
                body: {
                    full_name: data.full_name,
                    is_active: data.is_active,
                    is_superuser: data.is_superuser,
                    roles: data.roles,
                },
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            toast.success('User updated successfully')
            fetchUsers() // Refresh the list
        } catch (error) {
            console.error('Failed to update user:', error)
            toast.error('Failed to update user')
            throw error
        }
    }

    const handleUserDelete = async (user: User) => {
        if (!session?.accessToken) return

        try {
            await adminDeleteUserApiV1AdminUsersUserIdDelete({
                path: { user_id: user.id },
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            toast.success(`User ${user.email} deleted successfully`)
            fetchUsers() // Refresh the list
        } catch (error) {
            console.error('Failed to delete user:', error)
            toast.error('Failed to delete user')
        }
    }

    const handleRefresh = () => {
        fetchUsers()
    }

    // Create columns with edit and delete handlers
    const columns = createUserColumns(
        handleUserEdit,
        handleUserDelete,
        users.length,
    )

    // Configure the toolbar
    const toolbarConfig = {
        searchColumn: 'user',
        searchPlaceholder: 'Search users by name or email...',
        facetedFilters: [
            {
                column: 'status',
                title: 'Status',
                options: userStatusOptions,
            },
            {
                column: 'role',
                title: 'Role',
                options: userRoleOptions,
            },
        ],
    }

    return (
        <>
            <PageHeader title="Users" subtitle="Manage users" icon={Users}>
                <>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite User
                    </Button>
                </>
            </PageHeader>

            <FlexibleDataTable
                columns={columns}
                data={users}
                toolbarConfig={toolbarConfig}
                loading={loading}
                onRowClick={handleUserEdit}
            />

            <UserEditDialog
                user={selectedUser}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSave={handleUserSave}
            />
        </>
    )
}
