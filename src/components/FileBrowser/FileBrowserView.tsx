import React, { useState, useEffect, useMemo } from 'react'
import { Folder, MagnifyingGlass } from '@phosphor-icons/react'
import FileCard, { iconSlotClasses, type IconSize } from './FileCard'
import { cn } from '../../lib/utils'

export type FileEntry = {
  name: string
  cardInfoAvailable: boolean
}

export type CardInfo = {
  tag?: string | null
  subtitle?: string | null
  detail?: string | null
  thumbnail?: string | null
  /** Set by FileBrowser when getCardInfo rejects. Rendered on the card in place of subtitle/detail. */
  error?: string
}

export type DirectoryListing = {
  directories: string[]
  files: FileEntry[]
}

const folderIconPixelSizes: Record<IconSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
}

export type FileBrowserViewProps = {
  /** The current directory subpath. Empty string means root. */
  path: string
  /** The directory contents to render, or null while loading. */
  listing: DirectoryListing | null
  /** When true, shows a loading indicator in place of the listing. */
  navigating: boolean
  /** Error message to display, or null if there is no error. */
  navError: string | null
  /** Full relative path of the currently selected file, or null. */
  activeFile: string | null
  /** Map of file path → card metadata (tag, subtitle, detail, thumbnail). */
  cardInfo: Record<string, CardInfo>
  /** Display label for the breadcrumb home button. Has no effect on where navigation starts —
   *  the actual root directory is a backend concern. Defaults to 'root'. */
  rootLabel?: string
  /** When false, hides the icon/thumbnail slot on all cards for a compact layout. Defaults to true. */
  showIcon?: boolean
  /** Size of the icon/thumbnail slot on all cards: 'sm' (32 px), 'md' (48 × 48 px, default), 'lg' (64 px). */
  iconSize?: IconSize
  /** Optional external filter applied before the built-in text and tag filters. */
  filterFn?: (file: FileEntry) => boolean
  /** Called with the target subpath when the user navigates into a directory. */
  onNavigate: (subpath: string) => void
  /** Called with the filename when the user clicks a file card. */
  onFileClick: (name: string) => void
  /** Ref callback to attach the IntersectionObserver to each observable card element. */
  observeCard: (node: HTMLLIElement | null) => void
  /** Additional Tailwind classes applied to the root container. Use to override the default width. */
  className?: string
}

/**
 * The **View** layer of the file browser — it renders whatever state you pass
 * in and has no logic of its own. Every piece of state (current path, directory
 * listing, card metadata, loading/error status) is a prop; the caller decides
 * what to show and when.
 *
 * In MVC terms this is the **V**: it knows nothing about where data comes from
 * or how navigation state is stored. If you're familiar with the React
 * "presenter/container split" (also called "smart vs. dumb components"), this
 * is the presenter — the container is `FileBrowser`.
 *
 * ---
 *
 * **Which component should I import?**
 *
 * - **`FileBrowser`** — the right choice for most apps. It wraps `FileBrowserView`
 *   and manages navigation state, lazy card-info fetching via IntersectionObserver,
 *   and active-file tracking automatically. You supply three callbacks and it does
 *   the rest.
 *
 * - **`FileBrowserView`** — use this when you need to own the state yourself:
 *   syncing navigation to the URL (React Router), holding state in a shared store
 *   (Redux, Zustand, Jotai), server-rendering a pre-fetched listing, or testing
 *   rendering in isolation by passing data directly as props.
 *
 * The `filterFn` prop is only available on `FileBrowserView`. It lets the
 * consuming app apply an external predicate on top of the built-in text and
 * tag filters without reimplementing the filter bar.
 *
 */
export default function FileBrowserView({
  path, listing, navigating, navError, activeFile, cardInfo,
  rootLabel = 'root', showIcon = true, iconSize = 'md', filterFn,
  onNavigate, onFileClick, observeCard, className,
}: FileBrowserViewProps) {
  const parts = path ? path.split('/').filter(Boolean) : []

  const [textFilter, setTextFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('all')

  // Reset filters when the user navigates to a new directory
  useEffect(() => {
    setTextFilter('')
    setTagFilter('all')
  }, [path])

  // Collect unique tags from loaded cardInfo — tags trickle in as card-info
  // loads lazily, so the dropdown grows as more cards scroll into view.
  const availableTags = useMemo(() => {
    if (!listing) return []
    const tags = new Set<string>()
    listing.files.forEach(({ name }) => {
      const fullPath = path ? `${path}/${name}` : name
      const tag = cardInfo[fullPath]?.tag
      if (tag) tags.add(tag)
    })
    return Array.from(tags).sort()
  }, [listing, cardInfo, path])

  // Apply external filterFn first, then internal text + tag filters on top
  const visibleFiles = useMemo(() => {
    if (!listing) return []
    let files = listing.files
    if (filterFn) files = files.filter(filterFn)
    if (tagFilter !== 'all') {
      files = files.filter(({ name }) => {
        const fullPath = path ? `${path}/${name}` : name
        return cardInfo[fullPath]?.tag === tagFilter
      })
    }
    if (textFilter) {
      const lower = textFilter.toLowerCase()
      files = files.filter(({ name }) => name.toLowerCase().includes(lower))
    }
    return files
  }, [listing, cardInfo, path, filterFn, tagFilter, textFilter])

  return (
    <div className={cn('flex flex-col h-full min-h-0 w-72 min-w-48', className)}>

      {/* Breadcrumb */}
      <nav aria-label="Directory breadcrumb" className="px-3 py-2 border-b border-slate-200 flex items-center gap-1 min-w-0 flex-wrap">
        <button onClick={() => onNavigate('')}
          className="mono text-xs text-sky-700 hover:underline cursor-pointer whitespace-nowrap">
          {rootLabel}
        </button>
        {parts.map((part, i) => {
          const subpath = parts.slice(0, i + 1).join('/')
          return (
            <React.Fragment key={subpath}>
              <span className="text-slate-300 text-xs">/</span>
              <button onClick={() => onNavigate(subpath)}
                className="mono text-xs text-sky-700 hover:underline cursor-pointer truncate max-w-[120px]"
                title={part}>
                {part}
              </button>
            </React.Fragment>
          )
        })}
      </nav>

      {/* Filter bar — only shown once a listing is available */}
      {listing && (
        <div className="px-2 py-2 border-b border-slate-200 flex gap-2">
          {/* TODO: extract into a reusable SearchBox component for finch */}
          <div className="flex items-center flex-1 rounded border border-slate-200 bg-white focus-within:border-sky-700">
            <span className="pl-3 pr-2 flex items-center">
              <MagnifyingGlass size={13} className="text-slate-400"/>
            </span>
            <input
              type="text"
              aria-label="Filter files"
              value={textFilter}
              onChange={e => setTextFilter(e.target.value)}
              placeholder="filter file names…"
              className="flex-1 pr-3 py-1 text-xs bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {availableTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
              className="text-xs rounded border border-slate-200 bg-white text-slate-500 px-1.5 py-1 focus:outline-none focus:border-sky-700 cursor-pointer"
            >
              <option value="all">all</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Listing */}
      {navigating && (
        <div className="px-3 py-2 text-xs text-slate-400 mono">loading…</div>
      )}
      {navError && (
        <div className="px-3 py-2 text-xs text-red-500">{navError}</div>
      )}
      {listing && !navigating && (
        <ul className="flex-1 overflow-y-auto rounded-scrollbar p-1.5 space-y-1">
          {listing.directories.map(dir => (
            <li key={dir}>
              <button onClick={() => onNavigate(path ? `${path}/${dir}` : dir)}
                className="w-full text-left p-2 rounded-lg border cursor-pointer flex items-stretch gap-2.5 bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300">
                {showIcon && (
                  <div className={cn(
                    'shrink-0 rounded bg-slate-100 self-center flex items-center justify-center',
                    iconSlotClasses[iconSize],
                  )}>
                    <Folder size={folderIconPixelSizes[iconSize]} weight="fill" className="text-sky-700"/>
                  </div>
                )}
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <span className="font-semibold text-sm truncate text-slate-900">{dir}</span>
                </div>
              </button>
            </li>
          ))}
          {visibleFiles.map(({ name, cardInfoAvailable }) => {
            const fullPath = path ? `${path}/${name}` : name
            const isActive = activeFile === fullPath
            const info = cardInfo[fullPath]
            return (
              <li
                key={name}
                ref={cardInfoAvailable ? observeCard : undefined}
                data-filepath={cardInfoAvailable ? fullPath : undefined}
              >
                <FileCard
                  filename={name}
                  tag={info?.tag ?? null}
                  subtitle={info?.subtitle ?? null}
                  detail={info?.detail ?? null}
                  thumbnail={info?.thumbnail ?? null}
                  error={info?.error}
                  showIcon={showIcon}
                  iconSize={iconSize}
                  isActive={isActive}
                  onClick={() => onFileClick(name)}
                />
              </li>
            )
          })}
          {listing.directories.length === 0 && visibleFiles.length === 0 && (
            <li className="px-3 py-4 text-xs text-slate-400 text-center">
              {listing.files.length > 0 ? 'No files match the current filter' : 'Empty directory'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
