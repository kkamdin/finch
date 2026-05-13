import { File } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'

export type IconSize = 'sm' | 'md' | 'lg'

export type FileCardProps = {
  /** The filename displayed as the card's primary label. Required. */
  filename: string
  /** Short tag rendered as a pill badge beside the filename. */
  tag?: string | null
  /** First line of secondary text beneath the filename. */
  subtitle?: string | null
  /** Second line of secondary text, rendered in monospace (e.g. shape info). */
  detail?: string | null
  /**
   * Thumbnail image URL.
   * - string  → renders the image
   * - null    → renders an empty gray placeholder (thumbnail unavailable or backend error)
   * - undefined (omitted) → renders a generic file icon (thumbnails not in use)
   */
  thumbnail?: string | null
  /** When false, the entire left icon/thumbnail slot is hidden for compact display. Defaults to true. */
  showIcon?: boolean
  /**
   * Size of the left icon/thumbnail slot. Defaults to 'md' (48 × 48 px).
   * Use this to match the size your backend is returning for thumbnails — if you
   * request 64 px images from your backend, pass `iconSize="lg"` so the slot
   * fills them without cropping or blank space.
   */
  iconSize?: IconSize
  /**
   * Whether this card is the currently selected file. Drives active styling and
   * sets `aria-pressed` on the button — omit entirely for non-selectable cards.
   */
  isActive?: boolean
  /** Callback fired when the card is clicked. */
  onClick?: () => void
  /** Additional Tailwind classes applied to the root button element. */
  className?: string
}

const cardVariants = {
  default: 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300',
  active:  'bg-sky-50 border-sky-700',
}

const titleVariants = {
  default: 'text-slate-900',
  active:  'text-sky-900',
}

export const iconSlotClasses: Record<IconSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}

const iconPixelSizes: Record<IconSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
}

/**
 * A single file entry card in the file browser.
 */
export default function FileCard({
  filename, tag, subtitle, detail, thumbnail,
  showIcon = true, iconSize = 'md', isActive, onClick, className,
}: FileCardProps) {
  const variant = isActive ? 'active' : 'default'
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'w-full text-left p-2 rounded-lg border cursor-pointer flex items-stretch gap-2.5',
        cardVariants[variant],
        className,
      )}
    >
      {showIcon && (
        <div className={cn(
          'shrink-0 rounded overflow-hidden bg-slate-100 self-center flex items-center justify-center',
          iconSlotClasses[iconSize],
        )}>
          {typeof thumbnail === 'string'
            ? <img src={thumbnail} alt="" className="w-full h-full object-cover"/>
            : thumbnail === null
              ? null
              : <File size={iconPixelSizes[iconSize]} weight="fill" className="text-sky-700"/>
          }
        </div>
      )}
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <span className={`font-semibold text-sm truncate ${titleVariants[variant]}`}>
            {filename}
          </span>
          {/* TODO: add a tagClassName prop so consumers can pass Tailwind color strings directly
              (e.g. "border-blue-200 text-blue-600 bg-blue-50") to style the tag conditionally.
              The backend would supply a semantic hint and the consuming app would map it to
              a className, keeping color decisions in the frontend. */}
          {tag && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 bg-slate-50 whitespace-nowrap shrink-0 mt-0.5">
              {tag}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs mt-0.5 truncate text-slate-500">{subtitle}</p>}
        {detail && <p className="text-xs mt-0.5 truncate text-slate-400 font-mono">{detail}</p>}
      </div>
    </button>
  )
}
