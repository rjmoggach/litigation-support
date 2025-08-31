'use client'

import Link from 'next/link'
import { useState } from 'react'

import Burger from '@/components/navigation/burger'
import BurgerMenu from '@/components/navigation/burger-menu'
import type { NavItem } from '@/components/navigation/burger-menu-item'
import { UserMenu } from '@/components/navigation/user-menu'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Scale } from 'lucide-react'

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false)

    // Mobile menu items mirroring desktop links
    const mobileItems: NavItem[] = [{ label: 'Home', url: '/' }]

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container max-w-8xl mx-auto max-lg:px-3 flex h-16 justify-between items-center">
                <Link
                    href="/"
                    className="mr-6 flex items-center w-3/6 font-medium text-lg text-primary-foreground gap-2"
                >
                    <Scale className="size-6" />
                    Litigation Support
                </Link>

                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end w-3/6">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                        {/* Search could go here */}
                    </div>
                    {/* Desktop nav */}
                    <nav className="max-md:hidden flex items-center space-x-3">
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
