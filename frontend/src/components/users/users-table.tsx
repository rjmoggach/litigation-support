'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import type { User } from '@/lib/api/types.gen'
import { formatDistanceToNow } from 'date-fns'

interface UsersTableProps {
    users: User[]
    onUserClick?: (user: User) => void
    currentPage?: number
    totalPages?: number
    onPageChange?: (page: number) => void
}

export function UsersTable({
    users,
    onUserClick,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}: UsersTableProps) {
    const getUserInitials = (user: User) => {
        if (user.full_name) {
            return user.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2)
        }
        return user.email[0].toUpperCase()
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A'
        try {
            return formatDistanceToNow(new Date(dateString), {
                addSuffix: true,
            })
        } catch {
            return 'N/A'
        }
    }

    const renderPaginationItems = () => {
        const items = []
        const maxVisible = 5
        const halfVisible = Math.floor(maxVisible / 2)

        let startPage = Math.max(1, currentPage - halfVisible)
        let endPage = Math.min(totalPages, currentPage + halfVisible)

        if (currentPage <= halfVisible) {
            endPage = Math.min(totalPages, maxVisible)
        }
        if (currentPage > totalPages - halfVisible) {
            startPage = Math.max(1, totalPages - maxVisible + 1)
        }

        if (startPage > 1) {
            items.push(
                <PaginationItem key={1}>
                    <PaginationLink
                        onClick={() => onPageChange?.(1)}
                        isActive={currentPage === 1}
                    >
                        1
                    </PaginationLink>
                </PaginationItem>,
            )
            if (startPage > 2) {
                items.push(<PaginationEllipsis key="ellipsis-start" />)
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            items.push(
                <PaginationItem key={i}>
                    <PaginationLink
                        onClick={() => onPageChange?.(i)}
                        isActive={currentPage === i}
                    >
                        {i}
                    </PaginationLink>
                </PaginationItem>,
            )
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                items.push(<PaginationEllipsis key="ellipsis-end" />)
            }
            items.push(
                <PaginationItem key={totalPages}>
                    <PaginationLink
                        onClick={() => onPageChange?.(totalPages)}
                        isActive={currentPage === totalPages}
                    >
                        {totalPages}
                    </PaginationLink>
                </PaginationItem>,
            )
        }

        return items
    }

    return (
        <div className="space-y-3">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow
                            key={user.id}
                            className={onUserClick ? 'cursor-pointer' : ''}
                            onClick={() => onUserClick?.(user)}
                        >
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage
                                            src={(user as any)?.avatar_url} // eslint-disable-line @typescript-eslint/no-explicit-any
                                            alt={user.full_name || user.email}
                                        />
                                        <AvatarFallback className="text-xs">
                                            {getUserInitials(user)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">
                                            {user.full_name || 'No name'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            ID: {user.id}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                                <div className="flex gap-1">
                                    {user.is_active ? (
                                        <Badge
                                            variant="secondary"
                                            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                        >
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="secondary"
                                            className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                                        >
                                            Inactive
                                        </Badge>
                                    )}
                                    {(user as any)?.is_verified && ( // eslint-disable-line @typescript-eslint/no-explicit-any
                                        <Badge
                                            variant="secondary"
                                            className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                        >
                                            Verified
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                {user.is_superuser ? (
                                    <Badge
                                        variant="default"
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        Superuser
                                    </Badge>
                                ) : (
                                    (() => {
                                        const roles = (user as any)?.roles || [
                                            'user',
                                        ] // eslint-disable-line @typescript-eslint/no-explicit-any
                                        const highestRole = roles.includes(
                                            'admin',
                                        )
                                            ? 'admin'
                                            : roles.includes('staff')
                                              ? 'staff'
                                              : 'user'

                                        switch (highestRole) {
                                            case 'admin':
                                                return (
                                                    <Badge
                                                        variant="default"
                                                        className="bg-red-600 hover:bg-red-700"
                                                    >
                                                        Admin
                                                    </Badge>
                                                )
                                            case 'staff':
                                                return (
                                                    <Badge
                                                        variant="default"
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        Staff
                                                    </Badge>
                                                )
                                            default:
                                                return (
                                                    <Badge variant="outline">
                                                        User
                                                    </Badge>
                                                )
                                        }
                                    })()
                                )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {formatDate((user as any)?.created_at)}{' '}
                                {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                            </TableCell>
                        </TableRow>
                    ))}
                    {users.length === 0 && (
                        <TableRow>
                            <TableCell
                                colSpan={5}
                                className="text-center py-8 text-muted-foreground"
                            >
                                No users found
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {totalPages > 1 && onPageChange && (
                <Pagination>
                    <PaginationContent>
                        <PaginationPrevious
                            onClick={() =>
                                onPageChange(Math.max(1, currentPage - 1))
                            }
                            className={
                                currentPage === 1
                                    ? 'pointer-events-none opacity-50'
                                    : 'cursor-pointer'
                            }
                        />
                        {renderPaginationItems()}
                        <PaginationNext
                            onClick={() =>
                                onPageChange(
                                    Math.min(totalPages, currentPage + 1),
                                )
                            }
                            className={
                                currentPage === totalPages
                                    ? 'pointer-events-none opacity-50'
                                    : 'cursor-pointer'
                            }
                        />
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    )
}
