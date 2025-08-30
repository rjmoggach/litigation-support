'use client'

import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import * as React from 'react'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { DataTablePagination } from '@/components/data-table/data-table-pagination'
import {
    FlexibleDataTableToolbar,
    ToolbarConfig,
} from '@/components/data-table/flexible-data-table-toolbar'

interface FlexibleDataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    toolbarConfig?: ToolbarConfig
    loading?: boolean
    onRowClick?: (row: TData) => void
    enableRowSelection?: boolean
    enableSorting?: boolean
    enableColumnFilters?: boolean
    enablePagination?: boolean
    className?: string
}

export function FlexibleDataTable<TData, TValue>({
    columns,
    data,
    toolbarConfig,
    loading = false,
    onRowClick,
    enableRowSelection = true,
    enableSorting = true,
    enableColumnFilters = true,
    enablePagination = true,
    className,
}: FlexibleDataTableProps<TData, TValue>) {
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting: enableSorting ? sorting : [],
            columnVisibility,
            rowSelection: enableRowSelection ? rowSelection : {},
            columnFilters: enableColumnFilters ? columnFilters : [],
        },
        enableRowSelection,
        onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
        onSortingChange: enableSorting ? setSorting : undefined,
        onColumnFiltersChange: enableColumnFilters
            ? setColumnFilters
            : undefined,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: enableColumnFilters
            ? getFilteredRowModel()
            : undefined,
        getPaginationRowModel: enablePagination
            ? getPaginationRowModel()
            : undefined,
        getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
        getFacetedRowModel: enableColumnFilters
            ? getFacetedRowModel()
            : undefined,
        getFacetedUniqueValues: enableColumnFilters
            ? getFacetedUniqueValues()
            : undefined,
    })

    if (loading) {
        return (
            <div className={`space-y-4 ${className || ''}`}>
                {toolbarConfig && (
                    <div className="h-8 bg-muted animate-pulse rounded" />
                )}
                <div className="overflow-hidden rounded-sm border">
                    <div className="p-8">
                        <div className="flex items-center justify-center">
                            <div className="text-sm text-muted-foreground">
                                Loading...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`space-y-4 ${className || ''}`}>
            {toolbarConfig && (
                <FlexibleDataTableToolbar
                    table={table}
                    config={toolbarConfig}
                />
            )}
            <div className="overflow-hidden rounded-sm border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead
                                            key={header.id}
                                            colSpan={header.colSpan}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && 'selected'
                                    }
                                    className={
                                        onRowClick
                                            ? 'cursor-pointer hover:bg-muted/50'
                                            : ''
                                    }
                                    onClick={(e) => {
                                        // Don't trigger row click if clicking on interactive elements
                                        const target = e.target as HTMLElement
                                        const isInteractive = target.closest('button, [role="button"], [role="menuitem"], [role="checkbox"]')
                                        if (!isInteractive && onRowClick) {
                                            onRowClick(row.original)
                                        }
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {enablePagination && <DataTablePagination table={table} />}
        </div>
    )
}
