import { FooterContent } from './footer-content'

export function Footer() {
    return (
        <footer
            data-footer
            className="relative h-[100vh] z-50 bg-accent overflow-visible"
            style={{ clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)' }}
        >
            <div className="fixed bottom-0 h-[100vh] w-[100vw] max-w-full overflow-visible">
                <FooterContent />
            </div>
        </footer>
    )
}
