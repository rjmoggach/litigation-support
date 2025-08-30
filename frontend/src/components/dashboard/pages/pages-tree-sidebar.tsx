'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Search } from 'lucide-react'
import type { PageResponse } from '@/lib/api/types.gen'
import {
    listPagesAdminApiV1PagesAdminGet,
    createPageApiV1PagesPost,
    deletePageApiV1PagesPageIdDelete,
} from '@/lib/api/sdk.gen'
import { cn } from '@/lib/utils'
import { usePages } from '@/providers/pages-provider'
import { PageTreeNodeComponent, type PageTreeNode } from './page-tree-node'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
    movePageApiV1PagesPageIdMovePost,
} from '@/lib/api/sdk.gen'

interface PagesTreeSidebarProps {
    currentPageId?: number
    className?: string
    onPageSelect?: (pageId: number) => void
}

const ROOT_PAGE_ID = 1

export function PagesTreeSidebar({
    currentPageId,
    className,
    onPageSelect,
}: PagesTreeSidebarProps) {
    const { data: session } = useSession()
    const { pages: contextPages, setPages: setContextPages } = usePages()
    const [pages, setPages] = useState<PageTreeNode[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedPages, setExpandedPages] = useState<Set<number>>(
        new Set([ROOT_PAGE_ID]),
    )
    const [deleteDialogPage, setDeleteDialogPage] = useState<PageTreeNode | null>(null)

    const authToken = session?.accessToken

    // Set up drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    )

    // Load pages from API
    const loadPages = useCallback(async () => {
        if (!authToken) return

        try {
            setLoading(true)
            const response = await listPagesAdminApiV1PagesAdminGet({
                headers: { Authorization: `Bearer ${authToken}` },
                query: { skip: 0, limit: 500 },
            })

            const pageList = response.data || []
            setContextPages(pageList)
            const pagesWithHierarchy = organizePagesIntoTree(pageList)
            setPages(pagesWithHierarchy)
        } catch (error) {
            console.error('Failed to load pages:', error)
            toast.error('Failed to load pages')
        } finally {
            setLoading(false)
        }
    }, [authToken, setContextPages])

    // Organize pages into tree structure
    const organizePagesIntoTree = (flatPages: PageResponse[]): PageTreeNode[] => {
        const pageMap = new Map<number, PageTreeNode>()
        const rootPages: PageTreeNode[] = []

        // First pass: create all page nodes
        flatPages.forEach(page => {
            pageMap.set(page.id, { ...page, children: [] })
        })

        // Second pass: organize into tree
        flatPages.forEach(page => {
            const pageNode = pageMap.get(page.id)!
            if (!pageNode.parent_id || pageNode.parent_id === null) {
                rootPages.push(pageNode)
            } else {
                const parent = pageMap.get(pageNode.parent_id)
                if (parent) {
                    parent.children = parent.children || []
                    parent.children.push(pageNode)
                }
            }
        })

        // Sort by title
        const sortPages = (pages: PageTreeNode[]) => {
            pages.sort((a, b) => {
                if (a.id === ROOT_PAGE_ID) return -1
                if (b.id === ROOT_PAGE_ID) return 1
                return a.title.localeCompare(b.title)
            })
            pages.forEach(page => {
                if (page.children && page.children.length > 0) {
                    sortPages(page.children)
                }
            })
        }

        sortPages(rootPages)
        return rootPages
    }

    // Create new page
    const handleCreatePage = async (parentId?: number) => {
        if (!authToken) return

        try {
            const response = await createPageApiV1PagesPost({
                headers: { Authorization: `Bearer ${authToken}` },
                body: {
                    title: 'Untitled Page',
                    is_published: false,
                    is_private: false,
                    parent_id: parentId,
                },
            })

            if (response.data) {
                await loadPages()
                onPageSelect?.(response.data.id)
                if (parentId) {
                    setExpandedPages(prev => new Set([...prev, parentId]))
                }
            }
        } catch (error) {
            console.error('Failed to create page:', error)
            toast.error('Failed to create page')
        }
    }

    // Delete page
    const handleDeletePage = async (pageId: number) => {
        if (!authToken) return

        try {
            await deletePageApiV1PagesPageIdDelete({
                headers: { Authorization: `Bearer ${authToken}` },
                path: { page_id: pageId },
            })

            if (currentPageId === pageId) {
                onPageSelect?.(ROOT_PAGE_ID)
            }

            await loadPages()
            setDeleteDialogPage(null)
            toast.success('Page deleted successfully')
        } catch (error) {
            console.error('Failed to delete page:', error)
            toast.error('Failed to delete page')
        }
    }

    // Toggle page expansion
    const toggleExpanded = (pageId: number) => {
        setExpandedPages(prev => {
            const newSet = new Set(prev)
            if (newSet.has(pageId)) {
                newSet.delete(pageId)
            } else {
                newSet.add(pageId)
            }
            return newSet
        })
    }

    // Handle drag and drop
    const handleDragStart = (event: DragStartEvent) => {
        // Optional: Add drag start logic if needed
    }

    const handleDragOver = (event: DragOverEvent) => {
        // Optional: Add drag over logic if needed
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        
        if (!over || active.id === over.id) return
        
        const activeId = active.id.toString().replace('page-', '')
        const overId = over.id.toString()
        
        // Parse the drop zone info
        let targetPageId: number
        let position: 'above' | 'below' | 'inside' = 'inside'
        
        if (overId.startsWith('before-')) {
            targetPageId = parseInt(overId.replace('before-', ''))
            position = 'above'
        } else if (overId.startsWith('after-children-')) {
            targetPageId = parseInt(overId.replace('after-children-', ''))
            position = 'below'
        } else if (overId.startsWith('child-')) {
            targetPageId = parseInt(overId.replace('child-', ''))
            position = 'inside'
        } else {
            // Direct drop on a page
            targetPageId = parseInt(overId.replace('page-', ''))
            position = 'inside'
        }

        await handleMovePage(parseInt(activeId), targetPageId, position)
    }

    // Move page API call
    const handleMovePage = async (draggedPageId: number, targetPageId: number, position: 'above' | 'below' | 'inside') => {
        if (!authToken) return

        try {
            // Determine new parent ID based on position
            let newParentId: number | null = null
            
            if (position === 'inside') {
                // Drop inside = make target the parent
                newParentId = targetPageId
            } else {
                // Drop above/below = same parent as target
                const targetPage = flattenPages(pages).find(p => p.id === targetPageId)
                newParentId = targetPage?.parent_id || null
            }

            // Call the API to move the page
            await movePageApiV1PagesPageIdMovePost({
                headers: { Authorization: `Bearer ${authToken}` },
                path: { page_id: draggedPageId },
                body: {
                    page_id: draggedPageId,
                    new_parent_id: newParentId,
                },
            })

            // Refresh the pages list
            await loadPages()
            
            // If moved to be a child, expand the parent
            if (position === 'inside') {
                setExpandedPages(prev => new Set([...prev, targetPageId]))
            }

            toast.success('Page moved successfully')
        } catch (error) {
            console.error('Failed to move page:', error)
            toast.error('Failed to move page')
        }
    }

    // Filter pages based on search
    const filterPages = (pages: PageTreeNode[], query: string): PageTreeNode[] => {
        if (!query.trim()) return pages
        
        const lowerQuery = query.toLowerCase()
        const filtered: PageTreeNode[] = []
        
        pages.forEach(page => {
            const matchesSearch = page.title.toLowerCase().includes(lowerQuery) ||
                                 (page.description?.toLowerCase().includes(lowerQuery) ?? false)
            
            const filteredChildren = page.children ? filterPages(page.children, query) : []
            
            if (matchesSearch || filteredChildren.length > 0) {
                filtered.push({
                    ...page,
                    children: filteredChildren
                })
            }
        })
        
        return filtered
    }

    // Load pages on mount
    useEffect(() => {
        loadPages()
    }, [loadPages])

    // Update tree when context pages change
    useEffect(() => {
        if (contextPages.length > 0) {
            const pagesWithHierarchy = organizePagesIntoTree(contextPages)
            setPages(pagesWithHierarchy)
        }
    }, [contextPages])

    const filteredPages = filterPages(pages, searchQuery)

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header - Fixed at top of sidebar */}
            <div className="p-3 border-b bg-background/95 sticky top-0 z-10">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        Pages
                    </h3>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCreatePage()}
                        className="h-5 w-5 p-0"
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
                
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                        placeholder="Search pages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-7 h-6 text-xs bg-muted/50"
                    />
                </div>
            </div>

            {/* Pages Tree - Scrollable content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-1">
                    {loading ? (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                            Loading pages...
                        </div>
                    ) : filteredPages.length === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                            {searchQuery ? 'No pages found' : 'No pages yet'}
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext 
                                items={flattenPages(filteredPages).map(page => `page-${page.id}`)}
                                strategy={verticalListSortingStrategy}
                            >
                                {filteredPages.map(page => (
                                    <PageTreeNodeComponent
                                        key={page.id}
                                        node={page}
                                        level={0}
                                        currentPageId={currentPageId}
                                        expandedNodes={expandedPages}
                                        onToggle={toggleExpanded}
                                        onPageSelect={onPageSelect}
                                        onCreateChild={handleCreatePage}
                                        onDelete={(pageId) => {
                                            const pageToDelete = flattenPages(filteredPages).find(p => p.id === pageId)
                                            if (pageToDelete) setDeleteDialogPage(pageToDelete)
                                        }}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteDialogPage} onOpenChange={(open) => !open && setDeleteDialogPage(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Page</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteDialogPage?.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteDialogPage && handleDeletePage(deleteDialogPage.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// Helper function to flatten tree for finding pages
function flattenPages(pages: PageTreeNode[]): PageTreeNode[] {
    const result: PageTreeNode[] = []
    pages.forEach(page => {
        result.push(page)
        if (page.children && page.children.length > 0) {
            result.push(...flattenPages(page.children))
        }
    })
    return result
}