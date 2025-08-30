"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Metric } from 'web-vitals'

type WebVitalsEvent = CustomEvent<Metric>

export default function MonitoringTab() {
    const [metrics, setMetrics] = useState<Metric[]>([])

    useEffect(() => {
        const handler = (evt: Event) => {
            const e = evt as WebVitalsEvent
            const m = e.detail
            if (!m) return
            setMetrics((prev) => {
                const next = [m, ...prev]
                return next.slice(0, 10)
            })
        }
        window.addEventListener('web-vitals', handler as EventListener)
        return () => window.removeEventListener('web-vitals', handler as EventListener)
    }, [])

    const formatted = useMemo(() =>
        metrics.map((m) => ({
            id: m.id,
            name: m.name,
            value: Math.round(m.value),
            rating: m.rating,
        })),
    [metrics])

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Structured Data Validation</CardTitle>
                    <CardDescription>Schema validation status overview</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">Use the Validate button in the Structured Data tab to check current configuration.</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Web Vitals (Last 10)</CardTitle>
                    <CardDescription>Live metrics from client sessions</CardDescription>
                </CardHeader>
                <CardContent>
                    {formatted.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No metrics yet. Load public pages to generate Web Vitals.</div>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {formatted.map((m) => (
                                <li key={m.id} className="flex items-center justify-between border-b pb-1">
                                    <span className="font-medium">{m.name}</span>
                                    <span className="tabular-nums">{m.value}</span>
                                    <span className="uppercase text-muted-foreground">{m.rating}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
