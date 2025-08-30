"use client"

import { useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { useSeoSettings, sanitizeSeoUpdate } from '@/lib/hooks/use-seo-settings'
import { validateStructuredData } from '@/lib/seo/validator'
import type { SeoSettingsUpdate } from '@/lib/api/types.gen'
import { toast } from 'sonner'

function normalizeSameAs(value: string[] | undefined | null): string {
    if (!value?.length) return ''
    return value.join(', ')
}

function parseSameAs(value: string | undefined): string[] | undefined {
    if (!value) return undefined
    const arr = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    return arr.length ? arr : undefined
}

export default function StructuredDataTab() {
    const { data, save } = useSeoSettings()

    const form = useForm<SeoSettingsUpdate>({
        defaultValues: useMemo(
            () => ({
                organization_name: '',
                logo_url: '',
                same_as: undefined,
                contact_email: '',
                contact_phone: '',
            }),
            [],
        ),
    })

    useEffect(() => {
        if (!data) return
        form.reset({
            organization_name: data.organization_name ?? '',
            logo_url: data.logo_url ?? '',
            same_as: data.same_as ?? undefined,
            contact_email: data.contact_email ?? '',
            contact_phone: data.contact_phone ?? '',
        })
    }, [data, form])

    const status = useMemo(() => {
        const hasOrg = Boolean(form.getValues('organization_name'))
        const hasLogo = Boolean(form.getValues('logo_url'))
        const hasSameAs = Boolean(form.getValues('same_as')?.length)
        const ok = hasOrg && hasLogo
        return { ok, missing: [!hasOrg && 'Organization Name', !hasLogo && 'Logo URL', !hasSameAs && 'Same As'].filter(Boolean) as string[] }
    }, [form])

    const onSubmit = async (values: SeoSettingsUpdate) => {
        try {
            await save(sanitizeSeoUpdate(values))
            toast.success('Structured data settings saved')
        } catch {
            toast.error('Failed to save structured data settings')
        }
    }

    const onValidate = () => {
        const values = form.getValues()
        const result = validateStructuredData({
            organization_name: values.organization_name,
            logo_url: values.logo_url,
            same_as: values.same_as,
            contact_email: values.contact_email,
            contact_phone: values.contact_phone,
        })
        if (result.ok) {
            if (result.warnings.length) {
                toast.warning('Structured data is valid with warnings', {
                    description: result.warnings.join('\n'),
                })
            } else {
                toast.success('Structured data is valid')
            }
        } else {
            toast.error('Structured data has issues', {
                description: [...result.errors, ...(result.warnings.length ? ['Warnings:', ...result.warnings] : [])].join('\n'),
            })
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Organization</CardTitle>
                    {status.ok ? (
                        <Badge variant="default">Valid</Badge>
                    ) : (
                        <Badge variant="secondary">Incomplete: {status.missing.join(', ')}</Badge>
                    )}
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form className="grid gap-6 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
                            <FormField
                                control={form.control}
                                name="organization_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Organization Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Company, Inc." value={field.value ?? ''} onChange={field.onChange} />
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
                                            <Input placeholder="https://.../logo.png" value={field.value ?? ''} onChange={field.onChange} />
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

                            <FormField
                                control={form.control}
                                name="contact_email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="admin@example.com" value={field.value ?? ''} onChange={field.onChange} />
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
                                            <Input placeholder="+1 555-555-5555" value={field.value ?? ''} onChange={field.onChange} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="md:col-span-2 flex justify-end gap-3">
                                <Button type="button" variant="secondary" onClick={onValidate}>
                                    Validate
                                </Button>
                                <Button type="submit">Save</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Person</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Person schema configuration will be added in a later task. Organization-related fields above are used by current JSON-LD.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
