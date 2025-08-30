"use client"

import { useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useSeoSettings } from '@/lib/hooks/use-seo-settings'
import type { SeoSettingsUpdate } from '@/lib/api/types.gen'

export default function AiOptimizationTab() {
    const { data, save } = useSeoSettings()

    const form = useForm<SeoSettingsUpdate>({
        defaultValues: useMemo(
            () => ({
                enable_ai_optimization: false,
            }),
            [],
        ),
    })

    useEffect(() => {
        if (!data) return
        form.reset({
            enable_ai_optimization: Boolean(data.enable_ai_optimization),
        })
    }, [data, form])

    const onSubmit = async (values: SeoSettingsUpdate) => {
        try {
            await save({ enable_ai_optimization: Boolean(values.enable_ai_optimization) })
            toast.success('AI Optimization setting saved')
        } catch {
            toast.error('Failed to save AI Optimization setting')
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Optimization</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form className="grid gap-6" onSubmit={form.handleSubmit(onSubmit)}>
                        <FormField
                            control={form.control}
                            name="enable_ai_optimization"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                        <FormLabel>Enable AI Optimization</FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            Allow the system to enhance meta content when it is missing or weak.
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit">Save</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
