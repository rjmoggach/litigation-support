import { Block, Section } from '@/components/blocks'
import { FooterNavigation } from '@/components/blocks-footer/footer-navigation'
import { Mantra } from '@/components/navigation/mantra'
import { footerNavItems } from '@/content/navigation/data'
import { cn } from '@/lib/utils'
import { Scale } from 'lucide-react'

export const FooterContent = () => {
    return (
        <Section className="relative h-full flex flex-col">
            <Block
                width="container"
                className={cn(
                    'p-0 flex-auto items-center justify-between flex',
                    'max-sm:flex-col max-sm:text-center max-sm:justify-center max-sm:gap-10',
                )}
            >
                <Mantra />
                <div
                    className={cn(
                        'flex flex-row gap-10',
                        'md:flex-col md:gap-10',
                    )}
                >
                    <FooterNavigation items={footerNavItems} showThemeToggle />
                </div>
            </Block>
            <Block
                width="container"
                className={cn(
                    'flex flex-row justify-between items-center',
                    'max-sm:flex-col max-sm:gap-1 max-sm:text-center',
                )}
            >
                <div className="w-1/2 relative max-sm:text-xl text-2xl font-medium flex items-center gap-2">
                    <Scale className="size-8" />
                    Litigation Support
                </div>

                <div
                    className={cn(
                        'text-xs text-muted-foreground',
                        'max-md:text-center items-center',
                        'justify-center md:justify-end',
                    )}
                >
                    &copy;{new Date().getFullYear()}. All rights reserved.
                </div>
            </Block>
        </Section>
    )
}
