'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { SeoSettingsUpdate } from '@/lib/api/types.gen'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useSeoSettings, sanitizeSeoUpdate } from '@/lib/hooks/use-seo-settings'

function normalizeSameAs(value: string | string[] | null | undefined): string {
    if (!value) return ''
    if (Array.isArray(value)) return value.join(', ')
    return value
}

function parseSameAs(value: string | undefined): string[] | undefined {
    if (!value) return undefined
    const arr = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    return arr.length ? arr : undefined
}

export default function GlobalSeoTab() {
    const { data, save, loading } = useSeoSettings()

    const form = useForm<SeoSettingsUpdate>({
        defaultValues: useMemo(
            () => ({
                site_name: '',
                site_url: '',
                default_title: '',
                title_template: '',
                description: '',
                twitter_handle: '',
                logo_url: '',
                organization_name: '',
                same_as: undefined,
                contact_email: '',
                contact_phone: '',
                enable_ai_optimization: false,
            }),
            [],
        ),
    })

    useEffect(() => {
        if (!data) return
        form.reset({
            site_name: data.site_name ?? '',
            site_url: data.site_url ?? '',
            default_title: data.default_title ?? '',
            title_template: data.title_template ?? '',
            description: data.description ?? '',
            twitter_handle: data.twitter_handle ?? '',
            logo_url: data.logo_url ?? '',
            organization_name: data.organization_name ?? '',
            same_as: data.same_as ?? undefined,
            contact_email: data.contact_email ?? '',
            contact_phone: data.contact_phone ?? '',
            enable_ai_optimization: Boolean(data.enable_ai_optimization),
        })
    }, [data, form])

    const onSubmit = async (values: SeoSettingsUpdate) => {
        try {
            await save(sanitizeSeoUpdate(values))
            toast.success('SEO settings saved')
        } catch (err) {
            console.error('Failed to save SEO settings', err)
            toast.error('Failed to save SEO settings')
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Global Site Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form
                            className="grid gap-6 md:grid-cols-2"
                            onSubmit={form.handleSubmit(onSubmit)}
                        >
                            <FormField
                                control={form.control}
                                name="site_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Site Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="My Awesome Site"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="site_url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Site URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://example.com"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="default_title"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Default Title</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Default page title"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="title_template"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Title Template</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="%s | MySite"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                rows={4}
                                                placeholder="Default site description"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="twitter_handle"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Twitter Handle</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="@account"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="logo_url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Logo URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://.../logo.png"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="organization_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Organization Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Company, Inc."
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="contact_email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="admin@example.com"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="contact_phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Phone</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="+1 555-555-5555"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="enable_ai_optimization"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2 flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                            <FormLabel>Enable AI Optimization</FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                Allow AI to enhance meta content when missing or weak.
                                            </p>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={Boolean(field.value)}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="same_as"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>Same As (comma-separated URLs)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                rows={3}
                                                placeholder="https://twitter.com/..., https://github.com/..."
                                                value={normalizeSameAs(field.value as string[] | undefined)}
                                                onChange={(e) => field.onChange(parseSameAs(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="md:col-span-2 flex items-center justify-end gap-2">
                                <Button type="submit" disabled={loading}>Save</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
