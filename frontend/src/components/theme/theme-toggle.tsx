'use client'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    useEffect(() => {
        const metaThemeColor = document.querySelector(
            "meta[name='theme-color']",
        )
        const themeColor = theme === 'dark' ? '#000000' : '#ffffff'
        if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor)
    }, [theme])

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
            <Sun className="size-4 rotate-0 scale-[1.2] transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-[1.2]" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
