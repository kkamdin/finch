import { useState, useEffect, useRef, useCallback } from 'react'
import FileBrowserView, { type CardInfo, type DirectoryListing } from './FileBrowserView'

// Navigation root vs. rootLabel — why they're different things:
//
// The actual root directory is a backend concern passed via the listDirectory
// function. The frontend never sees the absolute path — all navigation uses
// relative subpaths, and the empty string '' is the convention for "give me
// the root listing". Keeping the absolute path on the backend means this
// component can be deployed without any knowledge of the server's filesystem
// layout, and there's no risk of the frontend constructing paths that escape
// the data root.
//
// rootLabel is purely a display name for the breadcrumb's home button. It has
// no effect on where navigation actually starts — that's always '' sent to
// listDirectory. Pass a short, meaningful label (e.g. the last path segment,
// or the project name) so the breadcrumb stays readable even when the real
// path is long.

export type FileBrowserProps = {
  /** Function that fetches a directory listing for the given subpath. '' means root. */
  listDirectory: (subpath: string) => Promise<DirectoryListing>
  /**
   * Function that fetches tag, subtitle, detail, and thumbnail for a single file.
   * If you need to request a specific thumbnail resolution from your backend,
   * hardcode the size in your implementation — match it to the `iconSize` you pass:
   * 'sm' → 32 px, 'md' → 48 px, 'lg' → 64 px.
   */
  getCardInfo: (subpath: string) => Promise<CardInfo>
  /** Called with the relative file path when the user clicks a file. */
  onLoadFile: (path: string) => void
  /** Display label for the breadcrumb home button. Defaults to 'root'. */
  rootLabel?: string
  /** When false, hides icon/thumbnail slots on all cards. Defaults to true. */
  showIcon?: boolean
  /**
   * Size of the icon/thumbnail slot on all cards.
   * - `'sm'` — 32 × 32 px, suits compact panels or small thumbnails
   * - `'md'` — 48 × 48 px (default), suits most use cases
   * - `'lg'` — 64 × 64 px, suits wider panels where thumbnail detail matters
   *
   * Match this to the resolution your backend returns for thumbnails to avoid
   * transferring images larger than the display slot.
   */
  iconSize?: 'sm' | 'md' | 'lg'
  /** Additional Tailwind classes applied to the root container. Use to override the default width. */
  className?: string
}

/**
 * The batteries-included file browser. You supply three async callbacks;
 * this component handles everything else — navigation state, lazy card-info
 * fetching (via IntersectionObserver so only visible cards are fetched),
 * and active-file tracking.
 *
 * In MVC terms this is the **C** (controller): it coordinates between your
 * data layer (`listDirectory`, `getCardInfo`) and the View (`FileBrowserView`).
 * In the React "presenter/container split", this is the container.
 *
 * **This is the component most apps should import.**
 *
 * If you need to own the navigation state yourself (e.g. to sync it with the
 * URL or a shared store), use `FileBrowserView` directly instead.
 */
export default function FileBrowser({
  listDirectory, getCardInfo, onLoadFile,
  rootLabel = 'root', showIcon = true, iconSize = 'md', className,
}: FileBrowserProps) {
  const [path, setPath] = useState('')
  const [listing, setListing] = useState<DirectoryListing | null>(null)
  const [navError, setNavError] = useState<string | null>(null)
  const [navigating, setNavigating] = useState(false)
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [cardInfo, setCardInfo] = useState<Record<string, CardInfo>>({})

  const cardObserverRef = useRef<IntersectionObserver | null>(null)
  const cardInfoFetchedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    cardObserverRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const fp = (entry.target as HTMLElement).dataset.filepath
        if (!fp || cardInfoFetchedRef.current.has(fp)) return
        cardInfoFetchedRef.current.add(fp)
        cardObserverRef.current!.unobserve(entry.target)
        getCardInfo(fp)
          .then(info => setCardInfo(prev => ({ ...prev, [fp]: info })))
          .catch(() => {})
      })
    }, { threshold: 0 })

    return () => cardObserverRef.current?.disconnect()
  }, [getCardInfo])

  const observeCard = useCallback((node: HTMLLIElement | null) => {
    if (node && cardObserverRef.current) cardObserverRef.current.observe(node)
  }, [])

  useEffect(() => {
    setCardInfo({})
    cardInfoFetchedRef.current = new Set()
  }, [path])

  const navigate = useCallback(async (subpath: string) => {
    setNavigating(true)
    setNavError(null)
    try {
      const result = await listDirectory(subpath)
      setListing(result)
      setPath(subpath)
    } catch (e) {
      setNavError(e instanceof Error ? e.message : String(e))
    } finally {
      setNavigating(false)
    }
  }, [listDirectory])

  useEffect(() => { navigate('') }, [navigate])

  function handleFileClick(filename: string) {
    const fullPath = path ? `${path}/${filename}` : filename
    setActiveFile(fullPath)
    onLoadFile(fullPath)
  }

  return (
    <FileBrowserView
      path={path}
      listing={listing}
      navigating={navigating}
      navError={navError}
      activeFile={activeFile}
      cardInfo={cardInfo}
      rootLabel={rootLabel}
      showIcon={showIcon}
      iconSize={iconSize}
      className={className}
      onNavigate={navigate}
      onFileClick={handleFileClick}
      observeCard={observeCard}
    />
  )
}
