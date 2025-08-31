'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PageResponse } from '@/lib/api/types.gen'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    ChevronDown,
    ChevronRight,
    Edit,
    Eye,
    FileText,
    GripVertical,
    Lock,
    MoreHorizontal,
    Plus,
    Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DropZone } from './drop-zone'

export interface PageTreeNode extends PageResponse {
    children: PageTreeNode[]
    isExpanded?: boolean
}

interface PageTreeNodeProps {
    node: PageTreeNode
    level: number
    currentPageId?: number
    expandedNodes: Set<number>
    onToggle: (nodeId: number) => void
    onPageSelect?: (pageId: number) => void
    onCreateChild: (parentId: number) => void
    onDelete: (pageId: number) => void
}

export function PageTreeNodeComponent({
    node,
    level,
    currentPageId,
    expandedNodes,
    onToggle,
    onPageSelect,
    onCreateChild,
    onDelete,
}: PageTreeNodeProps) {
    const router = useRouter()
    const hasChildren = node.children.length > 0
    const isCurrentPage = currentPageId === node.id
    const isExpanded = expandedNodes.has(node.id)
    const isRootPage = node.id === 1 // Home page

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `page-${node.id}`,
        disabled: isRootPage, // Disable dragging for home page
        data: {
            type: 'page',
            page: node,
            level,
        },
    })

    const dragStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const dropZoneMargin = level * 8 + 2
    const childDropZoneMargin = (level + 1) * 8 + 2
    const paddingLeft = level * 8 + 2

    return (
        <div className="select-none">
            {/* Drop zone above (for siblings) */}
            <DropZone
                id={`before-${node.id}`}
                className={cn(level > 0 && 'ml-1')}
                style={{ marginLeft: dropZoneMargin }}
            />

            <div ref={setNodeRef} style={dragStyle}>
                <div
                    className={cn(
                        'group flex items-center gap-1 py-1 px-1 rounded-sm hover:bg-accent/50 cursor-pointer transition-colors',
                        isCurrentPage &&
                            'bg-accent text-accent-foreground font-medium',
                        level > 0 && 'ml-1',
                        isDragging && 'bg-muted shadow-lg',
                    )}
                    style={{ paddingLeft: paddingLeft }}
                >
                    {/* Drag handle - only show if not root page */}
                    {!isRootPage && (
                        <div
                            {...attributes}
                            {...listeners}
                            className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 -ml-1"
                        >
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                        </div>
                    )}

                    {/* Expand/collapse button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={(e) => {
                            e.stopPropagation()
                            if (hasChildren) onToggle(node.id)
                        }}
                    >
                        {hasChildren ? (
                            isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                            ) : (
                                <ChevronRight className="h-3 w-3" />
                            )
                        ) : (
                            <FileText className="h-3 w-3 text-muted-foreground" />
                        )}
                    </Button>

                    {/* Page title */}
                    <div
                        className="flex-1 min-w-0 flex items-center gap-2"
                        onClick={() =>
                            onPageSelect
                                ? onPageSelect(node.id)
                                : router.push(`//pages/edit/${node.id}`)
                        }
                    >
                        <span className="truncate text-sm">{node.title}</span>

                        {/* Status badges */}
                        <div className="flex items-center gap-1">
                            {!node.is_published && (
                                <Badge
                                    variant="outline"
                                    className="h-4 text-[10px] p-1 border-muted-foreground/30 text-muted-foreground"
                                >
                                    Draft
                                </Badge>
                            )}
                            {node.is_private && (
                                <Badge
                                    variant="outline"
                                    className="h-4 text-[10px] p-1 border-destructive/50 text-destructive flex items-center gap-0.5"
                                >
                                    <Lock className="h-2 w-2" />
                                    Private
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Actions menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-muted"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                                onClick={() =>
                                    router.push(`//pages/edit/${node.id}`)
                                }
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </DropdownMenuItem>
                            {/* Only show Add Child for non-root pages */}
                            {!isRootPage && (
                                <DropdownMenuItem
                                    onClick={() => onCreateChild(node.id)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Child Page
                                </DropdownMenuItem>
                            )}
                            {node.is_published && !node.is_private && (
                                <DropdownMenuItem
                                    onClick={() =>
                                        window.open(
                                            `/pages/${node.url_path || node.slug}`,
                                            '_blank',
                                        )
                                    }
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Public
                                </DropdownMenuItem>
                            )}
                            {/* Only show delete for non-root pages */}
                            {!isRootPage && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => onDelete(node.id)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Drop zone for making pages children */}
            {isExpanded && (
                <DropZone
                    id={`child-${node.id}`}
                    className="ml-2"
                    style={{ marginLeft: childDropZoneMargin }}
                />
            )}

            {/* Render children */}
            {hasChildren && isExpanded && (
                <Collapsible open={isExpanded}>
                    <CollapsibleContent>
                        {node.children.map((child, index) => (
                            <PageTreeNodeComponent
                                key={child.id}
                                node={child}
                                level={level + 1}
                                currentPageId={currentPageId}
                                expandedNodes={expandedNodes}
                                onToggle={onToggle}
                                onPageSelect={onPageSelect}
                                onCreateChild={onCreateChild}
                                onDelete={onDelete}
                            />
                        ))}

                        {/* Drop zone after last child */}
                        {node.children.length > 0 && (
                            <DropZone
                                id={`after-children-${node.id}`}
                                className="ml-2"
                                style={{ marginLeft: childDropZoneMargin }}
                            />
                        )}
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    )
}
