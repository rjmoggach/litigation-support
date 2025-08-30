'use client'

import Link from 'next/link'
import { useState } from 'react'

import Burger from '@/components/navigation/burger'
import BurgerMenu from '@/components/navigation/burger-menu'
import type { NavItem } from '@/components/navigation/burger-menu-item'
import { UserMenu } from '@/components/navigation/user-menu'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false)

    // Mobile menu items mirroring desktop links
    const mobileItems: NavItem[] = [
        { label: 'About', url: '/about' },
        { label: 'Videos', url: '/videos' },
        { label: 'Contact', url: '/contact' },
    ]

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container max-w-4xl mx-auto max-lg:px-6 flex h-24 justify-between items-center">
                <Link
                    href="/"
                    className="mr-6 flex items-center w-2/6 sm:inline-block font-medium text-lg text-primary-foreground"
                >
                    Robert Moggach
                </Link>
                <div className="w-2/6 text-center flex justify-center max-md:hidden"></div>
                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end w-2/6">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                        {/* Search could go here */}
                    </div>
                    {/* Desktop nav */}
                    <nav className="max-md:hidden flex items-center space-x-4">
                        <Button size="navbar" variant="navbar" asChild>
                            <Link href="/about">About</Link>
                        </Button>
                        <Button size="navbar" variant="navbar" asChild>
                            <Link href="/videos">Videos</Link>
                        </Button>
                        <Button size="navbar" variant="navbar" asChild>
                            <Link href="/contact">Contact</Link>
                        </Button>
                        <ThemeToggle />

                        <UserMenu />
                    </nav>

                    {/* Mobile hamburger */}
                    <div className="md:hidden">
                        <Burger toggled={isOpen} toggle={setIsOpen} />
                    </div>
                </div>
            </div>
            {/* Mobile overlay menu */}
            <BurgerMenu
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                items={mobileItems}
            />
        </header>
    )
}
