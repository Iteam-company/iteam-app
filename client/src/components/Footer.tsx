export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
      &copy; {year} Iteam. All rights reserved.
    </footer>
  )
}
