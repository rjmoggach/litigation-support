'use client'

import { Table } from '@tanstack/react-table'
import { X } from 'lucide-react'
import * as React from 'react'

import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface FilterOption {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
}

export interface ToolbarConfig {
    searchColumn?: string
    searchPlaceholder?: string
    facetedFilters?: Array<{
        column: string
        title: string
        options: FilterOption[]
    }>
    showViewOptions?: boolean
    customActions?: React.ReactNode
}

interface FlexibleDataTableToolbarProps<TData> {
    table: Table<TData>
    config?: ToolbarConfig
}

export function FlexibleDataTableToolbar<TData>({
    table,
    config = {},
}: FlexibleDataTableToolbarProps<TData>) {
    const {
        searchColumn,
        searchPlaceholder = 'Search...',
        facetedFilters = [],
        showViewOptions = true,
        customActions,
    } = config

    const isFiltered = table.getState().columnFilters.length > 0

    return (
        <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
                {searchColumn && (
                    <Input
                        placeholder={searchPlaceholder}
                        value={
                            (table
                                .getColumn(searchColumn)
                                ?.getFilterValue() as string) ?? ''
                        }
                        onChange={(event) =>
                            table
                                .getColumn(searchColumn)
                                ?.setFilterValue(event.target.value)
                        }
                        className="h-8 w-[150px] lg:w-[250px]"
                    />
                )}

                {facetedFilters.map(({ column, title, options }) => {
                    const tableColumn = table.getColumn(column)
                    return tableColumn ? (
                        <DataTableFacetedFilter
                            key={column}
                            column={tableColumn}
                            title={title}
                            options={options}
                        />
                    ) : null
                })}

                {isFiltered && (
                    <Button
                        variant="ghost"
                        onClick={() => table.resetColumnFilters()}
                        className="h-8 px-2 lg:px-3"
                    >
                        Reset
                        <X />
                    </Button>
                )}

                {customActions && (
                    <div className="flex items-center space-x-2">
                        {customActions}
                    </div>
                )}
            </div>

            {showViewOptions && <DataTableViewOptions table={table} />}
        </div>
    )
}
