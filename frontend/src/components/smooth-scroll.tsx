'use client'

import Lenis from 'lenis'
import { useEffect } from 'react'

export function SmoothScroll() {
    useEffect(() => {
        // Wait for OverlayScrollbars to initialize if present
        const initLenis = () => {
            // Check if we're using OverlayScrollbars full-page wrapper
            const osViewport = document.querySelector('.os-viewport')
            
            const lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                orientation: 'vertical',
                gestureOrientation: 'vertical',
                smoothWheel: true,
                touchMultiplier: 2,
                wheelMultiplier: 1,
                infinite: false,
                // If OverlayScrollbars is present, target its viewport
                wrapper: osViewport || window,
                content: osViewport?.firstElementChild || document.documentElement,
            })

            function raf(time: number) {
                lenis.raf(time)
                requestAnimationFrame(raf)
            }

            requestAnimationFrame(raf)

            return () => {
                lenis.destroy()
            }
        }

        // Initialize after a brief delay to ensure OverlayScrollbars is ready
        const timeoutId = setTimeout(initLenis, 100)

        return () => {
            clearTimeout(timeoutId)
        }
    }, [])

    return null
}
