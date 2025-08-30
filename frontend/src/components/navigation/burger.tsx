import { cn } from '@/lib/utils'
import { Dispatch, SetStateAction } from 'react'

interface BurgerProps {
    className?: string
    toggle?: Dispatch<SetStateAction<boolean>>
    toggled?: boolean
    onToggle?: (toggled: boolean) => void
    disabled?: boolean
}

export const Burger = ({
    className = '',
    toggle,
    toggled,
    onToggle,
    disabled = false,
}: BurgerProps) => {
    const isToggled = toggled !== undefined ? toggled : false

    const handler = () => {
        if (disabled) return
        if (toggle) toggle(!isToggled)
        if (onToggle) onToggle(!isToggled)
    }

    return (
        <button
            onClick={handler}
            className={`relative flex flex-col justify-center items-center w-10 h-10 rounded-full group z-50 ${
                disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            } ${className} focus:outline-none focus:ring-0 focus:ring-offset-0 active:outline-none active:ring-0`}
            aria-label="Toggle menu"
            aria-expanded={isToggled}
            disabled={disabled}
            style={{ WebkitTapHighlightColor: 'transparent' }}
        >
            <div
                className="flex justify-center items-center"
                style={{
                    transition: `0.1s ease ${isToggled ? '0s' : '0.1s'}`,
                    transform: isToggled ? 'translateY(4px)' : 'none',
                    width: '20px',
                }}
            >
                <span
                    className={cn(
                        'block',
                        isToggled
                            ? 'w-[20px] bg-foreground/70 group-hover:bg-foreground'
                            : 'w-[32px] sm:w-[36px]  bg-foreground',
                    )}
                    style={{
                        height: '2px',
                        transition: `0.1s ease ${isToggled ? '0.1s' : '0s'}`,
                        transform: isToggled ? 'rotate(45deg)' : 'none',
                    }}
                />
            </div>

            <div
                className="flex justify-center items-center"
                style={{
                    transition: `0.1s ease ${isToggled ? '0s' : '0.1s'}`,
                    transform: isToggled ? 'translateY(-4px)' : 'none',
                    marginTop: '6px',
                    width: '20px',
                }}
            >
                <span
                    className={cn(
                        'block',
                        isToggled
                            ? 'w-[20px] bg-foreground/70 group-hover:bg-foreground'
                            : 'w-[32px] sm:w-[36px]  bg-foreground',
                    )}
                    style={{
                        height: '2px',
                        transition: `0.1s ease ${isToggled ? '0.1s' : '0s'}`,
                        transform: isToggled ? 'rotate(-45deg)' : 'none',
                    }}
                />
            </div>
        </button>
    )
}

export default Burger
