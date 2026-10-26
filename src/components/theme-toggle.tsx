import { useState } from "react"
import { MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Tracks the `dark` class on <html>, which the layout sets before first paint. */
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))
  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem("theme", next ? "dark" : "light")
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit.
    }
    setDark(next)
  }
  return { dark, toggle }
}

export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="bg-card/80 shadow-sm backdrop-blur-sm"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onToggle}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
