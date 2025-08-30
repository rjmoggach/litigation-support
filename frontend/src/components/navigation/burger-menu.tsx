import { MantraMenu } from '@/components/navigation/mantra-menu'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { cn } from '@/lib/utils'
import { AnimatePresence, cubicBezier, motion } from 'framer-motion'
import React, { useEffect } from 'react'
import BurgerMenuItem, { NavItem } from './burger-menu-item'

interface BurgerMenuProps {
    isOpen: boolean
    onClose: () => void
    items: NavItem[]
    showThemeToggle?: boolean
}

const BurgerMenu: React.FC<BurgerMenuProps> = ({
    isOpen,
    onClose,
    items,
    showThemeToggle = true,
}) => {
    // Handle escape key to close menu
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        window.addEventListener('keydown', handleEscKey)
        return () => window.removeEventListener('keydown', handleEscKey)
    }, [isOpen, onClose])

    // Handle body scroll lock when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // Items are provided by parent to avoid cross-project dependencies

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.3,
                ease: cubicBezier(0.17, 0.55, 0.55, 1),
                delayChildren: 0.1,
                staggerChildren: 0.1,
            },
        },
        exit: {
            opacity: 0,
            transition: {
                duration: 0.3,
                ease: cubicBezier(0.17, 0.55, 0.55, 1),
                staggerChildren: 0.05,
                staggerDirection: -1,
            },
        },
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
        exit: { y: 20, opacity: 0 },
    }

    const handleNavClick = () => {
        // Close after clicking any item
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className={cn(
                        'fixed inset-0 bg-background/95 backdrop-blur-md',
                        'flex flex-col items-center justify-center',
                        'overflow-hidden w-[100vw] h-[100vh]',
                        // Set z-index to be below the navbar
                        'z-30',
                    )}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={containerVariants}
                >
                    <div className="w-full max-w-md mx-auto px-4 flex flex-col justify-center h-full pb-16">
                        <motion.nav className="flex flex-col items-center justify-center w-full space-y-12">
                            {items.map((item) => (
                                <motion.div
                                    key={item.url}
                                    variants={itemVariants}
                                    className="text-center text-xl "
                                >
                                    <BurgerMenuItem
                                        route={item}
                                        onClick={handleNavClick}
                                    />
                                </motion.div>
                            ))}

                            {/* Theme Switcher */}
                            {showThemeToggle && (
                                <motion.div
                                    variants={itemVariants}
                                    className="mt-8 text-center"
                                >
                                    <ThemeToggle />
                                </motion.div>
                            )}
                            {/* Mantra menu */}
                            <motion.div
                                variants={itemVariants}
                                className="mt-10 text-center"
                                onClick={onClose}
                            >
                                <MantraMenu />
                            </motion.div>
                        </motion.nav>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default BurgerMenu
