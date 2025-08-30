'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CompanyResponse } from '@/lib/api'
import { Building2, Plus, Search, Trash2 } from 'lucide-react'
import { SelectedItem } from './detail-form'

interface CompanyListProps {
    companies: CompanyResponse[]
    loading: boolean
    selected: SelectedItem
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onCompanySelect: (company: CompanyResponse) => void
    onCompanyDelete: (company: CompanyResponse) => void
    onAddCompany: () => void
}

export function CompanyList({
    companies,
    loading,
    selected,
    onSearchChange,
    onCompanySelect,
    onCompanyDelete,
    onAddCompany,
}: CompanyListProps) {
    return (
        <Card className="w-80 flex flex-col pt-4 pb-0">
            <CardHeader className="px-2 my-0">
                <CardTitle className="flex items-center gap-2 text-lg px-2">
                    <Building2 className="h-5 w-5" />
                    Companies
                </CardTitle>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search companies..."
                        className="pl-9"
                        onChange={onSearchChange}
                    />
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 border-t border-border">
                    <div>
                        {loading ? (
                            <div className="p-4">Loading...</div>
                        ) : (
                            companies.map((company) => (
                                <div
                                    key={company.id}
                                    onClick={() => onCompanySelect(company)}
                                    className={`group px-4 py-2 border-b cursor-pointer transition-colors hover:bg-accent/35 ${
                                        (selected.type === 'company' &&
                                            selected.item?.id === company.id) ||
                                        (selected.type === 'person' &&
                                            selected.companyContext?.id ===
                                                company.id)
                                            ? 'bg-accent/55 hover:bg-accent/55 border-l-4 border-l-primary'
                                            : ''
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                                {company.name}
                                            </div>
                                            {company.email && (
                                                <div className="text-sm text-muted-foreground truncate">
                                                    {company.email}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 ml-2"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onCompanyDelete(company)
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
                <div className="p-2 border-t">
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={onAddCompany}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Company
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
