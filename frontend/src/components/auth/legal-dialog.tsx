'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import ReactMarkdown from 'react-markdown'

interface LegalDialogProps {
    title: string
    lastUpdated: string
    content: string
    triggerText: string
}

export function LegalDialog({
    title,
    lastUpdated,
    content,
    triggerText,
}: LegalDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="underline underline-offset-4 hover:text-primary">
                    {triggerText}
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Last updated: {lastUpdated}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[400px] w-full rounded-md border p-3 overflow-auto touch-auto">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
