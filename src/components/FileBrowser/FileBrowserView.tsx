import React, { useState, useEffect, useMemo } from 'react'
import { Folder, MagnifyingGlass } from '@phosphor-icons/react'
import FileCard from './FileCard'

export type FileEntry = {
  name: string
  card_info_available: boolean
}

export type CardInfo = {
  tag?: string | null
  subtitle?: string | null
  detail?: string | null
  thumbnail?: string | null
}

export type DirectoryListing = {
  directories: string[]
  files: FileEntry[]
}

export type FileBrowserViewProps = {
  path: string
  listing: DirectoryListing | null
  navigating: boolean
  navError: string | null
  activeFile: string | null
  cardInfo: Record<string, CardInfo>
  /** Display label for the breadcrumb home button. Has no effect on where navigation starts —
   *  the actual root directory is a backend concern. Defaults to 'root'. */
  rootLabel?: string
  /** When false, hides the icon/thumbnail slot on all cards for a compact layout. Defaults to true. */
  showIcon?: boolean
  /** Optional external filter applied before the built-in text and tag filters. */
  filterFn?: (file: FileEntry) => boolean
  onNavigate: (subpath: string) => void
  onFileClick: (name: string) => void
  observeCard: (node: HTMLLIElement | null) => void
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
 */
export default function FileBrowserView({
  path, listing, navigating, navError, activeFile, cardInfo,
  rootLabel = 'root', showIcon = true, filterFn,
  onNavigate, onFileClick, observeCard,
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
    <div className="flex flex-col h-full min-h-0">

      {/* Breadcrumb */}
      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1 min-w-0 flex-wrap">
        <button onClick={() => onNavigate('')}
          className="mono text-[11px] text-sky-700 hover:underline cursor-pointer whitespace-nowrap">
          {rootLabel}
        </button>
        {parts.map((part, i) => {
          const subpath = parts.slice(0, i + 1).join('/')
          return (
            <React.Fragment key={subpath}>
              <span className="text-slate-300 text-[11px]">/</span>
              <button onClick={() => onNavigate(subpath)}
                className="mono text-[11px] text-sky-700 hover:underline cursor-pointer truncate max-w-[120px]"
                title={part}>
                {part}
              </button>
            </React.Fragment>
          )
        })}
      </div>

      {/* Filter bar — only shown once a listing is available */}
      {listing && (
        <div className="px-2 py-2 border-b border-slate-100 flex gap-2">
          {/* TODO: extract into a reusable SearchBox component for finch */}
          <div className="flex items-center flex-1 rounded border border-slate-200 bg-white focus-within:border-sky-400">
            <span className="pl-3 pr-2 flex items-center">
              <MagnifyingGlass size={13} className="text-slate-400"/>
            </span>
            <input
              type="text"
              value={textFilter}
              onChange={e => setTextFilter(e.target.value)}
              placeholder="filter file names…"
              className="flex-1 pr-3 py-1 text-[11px] bg-transparent placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {availableTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
              className="text-[11px] rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-600 focus:outline-none focus:border-sky-400 cursor-pointer"
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
        <div className="px-3 py-2 text-[11px] text-slate-400 mono">loading…</div>
      )}
      {navError && (
        <div className="px-3 py-2 text-[11px] text-red-600">{navError}</div>
      )}
      {listing && !navigating && (
        <ul className="flex-1 overflow-y-auto rounded-scrollbar p-1.5 space-y-1">
          {listing.directories.map(dir => (
            <li key={dir}>
              <button onClick={() => onNavigate(path ? `${path}/${dir}` : dir)}
                className="w-full text-left p-2 rounded-lg border cursor-pointer flex items-stretch gap-2.5 bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300">
                {showIcon && (
                  <div className="w-12 h-12 shrink-0 rounded bg-slate-100 self-center flex items-center justify-center">
                    <Folder size={24} weight="fill" className="text-sky-700"/>
                  </div>
                )}
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <span className="font-semibold text-sm truncate text-slate-800">{dir}</span>
                </div>
              </button>
            </li>
          ))}
          {visibleFiles.map(({ name, card_info_available }) => {
            const fullPath = path ? `${path}/${name}` : name
            const isActive = activeFile === fullPath
            const info = cardInfo[fullPath]
            return (
              <li
                key={name}
                ref={card_info_available ? observeCard : undefined}
                data-filepath={card_info_available ? fullPath : undefined}
              >
                <FileCard
                  filename={name}
                  tag={info?.tag ?? null}
                  subtitle={info?.subtitle ?? null}
                  detail={info?.detail ?? null}
                  thumbnail={info?.thumbnail ?? null}
                  showIcon={showIcon}
                  isActive={isActive}
                  onClick={() => onFileClick(name)}
                />
              </li>
            )
          })}
          {listing.directories.length === 0 && visibleFiles.length === 0 && (
            <li className="px-3 py-4 text-[11px] text-slate-400 text-center">
              {listing.files.length > 0 ? 'No files match the current filter' : 'Empty directory'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
