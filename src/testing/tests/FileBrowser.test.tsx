import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FileBrowser from '../../components/FileBrowser/FileBrowser';
import FileBrowserView, { type DirectoryListing, type CardInfo } from '../../components/FileBrowser/FileBrowserView';

// jsdom doesn't implement IntersectionObserver — stub with a real class so `new` works
const observeMock = vi.fn()
const disconnectMock = vi.fn()

class IntersectionObserverStub {
  observe = observeMock
  unobserve = vi.fn()
  disconnect = disconnectMock
  constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

const rootListing: DirectoryListing = {
  directories: ['2024-01'],
  files: [
    { name: 'scan_001.h5', cardInfoAvailable: false },
    { name: 'scan_002.h5', cardInfoAvailable: true },
  ],
}

const subdirListing: DirectoryListing = {
  directories: [],
  files: [{ name: 'dark_field.h5', cardInfoAvailable: false }],
}

const cardInfoResult: CardInfo = { tag: 'hdf5', subtitle: '100 × 100' }

function makeProps(overrides = {}) {
  return {
    listDirectory: vi.fn().mockResolvedValue(rootListing),
    getCardInfo: vi.fn().mockResolvedValue(cardInfoResult),
    onLoadFile: vi.fn(),
    ...overrides,
  }
}

describe('FileBrowser', () => {
  it('calls listDirectory with empty string on mount', async () => {
    const props = makeProps()
    render(<FileBrowser {...props} />)
    await waitFor(() => expect(props.listDirectory).toHaveBeenCalledWith(''))
  })

  it('renders directories and files from the initial listing', async () => {
    const props = makeProps()
    render(<FileBrowser {...props} />)
    await waitFor(() => {
      expect(screen.getByText('2024-01')).toBeInTheDocument()
      expect(screen.getByText('scan_001.h5')).toBeInTheDocument()
      expect(screen.getByText('scan_002.h5')).toBeInTheDocument()
    })
  })

  it('shows an error message when listDirectory rejects', async () => {
    const props = makeProps({
      listDirectory: vi.fn().mockRejectedValue(new Error('connection refused')),
    })
    render(<FileBrowser {...props} />)
    await waitFor(() => {
      expect(screen.getByText('connection refused')).toBeInTheDocument()
    })
  })

  it('calls onLoadFile with the relative file path when a file is clicked', async () => {
    const props = makeProps()
    render(<FileBrowser {...props} />)
    await waitFor(() => screen.getByText('scan_001.h5'))
    fireEvent.click(screen.getByText('scan_001.h5'))
    expect(props.onLoadFile).toHaveBeenCalledWith('scan_001.h5')
  })

  it('navigates into a directory and calls listDirectory with its subpath', async () => {
    const props = makeProps({
      listDirectory: vi.fn()
        .mockResolvedValueOnce(rootListing)
        .mockResolvedValueOnce(subdirListing),
    })
    render(<FileBrowser {...props} />)
    await waitFor(() => screen.getByText('2024-01'))
    fireEvent.click(screen.getByText('2024-01'))
    await waitFor(() => expect(props.listDirectory).toHaveBeenCalledWith('2024-01'))
    await waitFor(() => screen.getByText('dark_field.h5'))
  })

  it('prefixes the subdirectory path when clicking a file in a subdirectory', async () => {
    const props = makeProps({
      listDirectory: vi.fn()
        .mockResolvedValueOnce(rootListing)
        .mockResolvedValueOnce(subdirListing),
    })
    render(<FileBrowser {...props} />)
    await waitFor(() => screen.getByText('2024-01'))
    fireEvent.click(screen.getByText('2024-01'))
    await waitFor(() => screen.getByText('dark_field.h5'))
    fireEvent.click(screen.getByText('dark_field.h5'))
    expect(props.onLoadFile).toHaveBeenCalledWith('2024-01/dark_field.h5')
  })

  it('uses the rootLabel prop in the breadcrumb', async () => {
    const props = makeProps()
    render(<FileBrowser {...props} rootLabel="my-data" />)
    await waitFor(() => expect(screen.getByText('my-data')).toBeInTheDocument())
  })

  it('disconnects the IntersectionObserver on unmount', () => {
    const props = makeProps()
    const { unmount } = render(<FileBrowser {...props} />)
    unmount()
    expect(disconnectMock).toHaveBeenCalled()
  })

  it('renders md-sized icon slots by default', async () => {
    const props = makeProps()
    const { container } = render(<FileBrowser {...props} />)
    await waitFor(() => screen.getByText('2024-01'))
    expect(container.querySelector('.w-12')).toBeInTheDocument()
    expect(container.querySelector('.w-16')).not.toBeInTheDocument()
  })

  it('renders lg-sized icon slots when iconSize="lg"', async () => {
    const props = makeProps()
    const { container } = render(<FileBrowser {...props} iconSize="lg" />)
    await waitFor(() => screen.getByText('2024-01'))
    expect(container.querySelector('.w-16')).toBeInTheDocument()
    expect(container.querySelector('.w-12')).not.toBeInTheDocument()
  })

  it('renders sm-sized icon slots when iconSize="sm"', async () => {
    const props = makeProps()
    const { container } = render(<FileBrowser {...props} iconSize="sm" />)
    await waitFor(() => screen.getByText('2024-01'))
    expect(container.querySelector('.w-8')).toBeInTheDocument()
    expect(container.querySelector('.w-12')).not.toBeInTheDocument()
  })

  it('renders the error message on the card when getCardInfo rejects', async () => {
    let ioCallback: IntersectionObserverCallback | null = null
    vi.stubGlobal('IntersectionObserver', class {
      unobserve = vi.fn()
      disconnect = vi.fn()
      constructor(cb: IntersectionObserverCallback) { ioCallback = cb }
      observe(el: Element) {
        ioCallback?.([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
    })

    const props = makeProps({
      listDirectory: vi.fn().mockResolvedValue({
        directories: [],
        files: [{ name: 'scan_001.h5', cardInfoAvailable: true }],
      }),
      getCardInfo: vi.fn().mockRejectedValue(new Error('failed to read metadata')),
    })

    render(<FileBrowser {...props} />)
    await waitFor(() => screen.getByText('scan_001.h5'))
    await waitFor(() => expect(screen.getByText('failed to read metadata')).toBeInTheDocument())
  })

  it('calls an updated onCardInfoError when the prop changes before getCardInfo settles', async () => {
    let ioCallback: IntersectionObserverCallback | null = null
    vi.stubGlobal('IntersectionObserver', class {
      unobserve = vi.fn()
      disconnect = vi.fn()
      constructor(cb: IntersectionObserverCallback) { ioCallback = cb }
      observe(el: Element) {
        ioCallback?.([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
    })

    let rejectCard!: (err: Error) => void
    const slowReject = new Promise<CardInfo>((_, reject) => { rejectCard = reject })

    const originalError = vi.fn()
    const updatedError = vi.fn()
    const getCardInfo = vi.fn().mockReturnValue(slowReject)
    const listDirectory = vi.fn().mockResolvedValue({
      directories: [],
      files: [{ name: 'scan_001.h5', cardInfoAvailable: true }],
    })

    const { rerender } = render(
      <FileBrowser
        listDirectory={listDirectory}
        getCardInfo={getCardInfo}
        onLoadFile={vi.fn()}
        onCardInfoError={originalError}
      />
    )

    // IO stub fires getCardInfo synchronously on observe — wait for both.
    await waitFor(() => expect(screen.getByText('scan_001.h5')).toBeInTheDocument())
    await waitFor(() => expect(getCardInfo).toHaveBeenCalled())

    // Swap onCardInfoError before the slow promise settles.
    rerender(
      <FileBrowser
        listDirectory={listDirectory}
        getCardInfo={getCardInfo}
        onLoadFile={vi.fn()}
        onCardInfoError={updatedError}
      />
    )

    // Reject now — ref should see updatedError, not the stale originalError.
    rejectCard(new Error('fetch failed'))

    await waitFor(() => expect(updatedError).toHaveBeenCalledWith('scan_001.h5', expect.any(Error)))
    expect(originalError).not.toHaveBeenCalled()
  })

  it('calls onCardInfoError with the subpath and error when getCardInfo rejects', async () => {
    // Override the beforeEach stub with one that captures the callback and fires it
    // synchronously on observe() so card-info fetches are triggered in jsdom.
    let ioCallback: IntersectionObserverCallback | null = null
    vi.stubGlobal('IntersectionObserver', class {
      unobserve = vi.fn()
      disconnect = vi.fn()
      constructor(cb: IntersectionObserverCallback) { ioCallback = cb }
      observe(el: Element) {
        ioCallback?.([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
    })

    const error = new Error('backend unavailable')
    const onCardInfoError = vi.fn()
    const props = makeProps({
      listDirectory: vi.fn().mockResolvedValue({
        directories: [],
        files: [{ name: 'scan_001.h5', cardInfoAvailable: true }],
      }),
      getCardInfo: vi.fn().mockRejectedValue(error),
      onCardInfoError,
    })

    render(<FileBrowser {...props} />)
    await waitFor(() => screen.getByText('scan_001.h5'))
    await waitFor(() => expect(onCardInfoError).toHaveBeenCalledWith('scan_001.h5', error))
  })

  it('does not throw when getCardInfo rejects and onCardInfoError is omitted', async () => {
    let ioCallback: IntersectionObserverCallback | null = null
    vi.stubGlobal('IntersectionObserver', class {
      unobserve = vi.fn()
      disconnect = vi.fn()
      constructor(cb: IntersectionObserverCallback) { ioCallback = cb }
      observe(el: Element) {
        ioCallback?.([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
    })

    const props = makeProps({
      listDirectory: vi.fn().mockResolvedValue({
        directories: [],
        files: [{ name: 'scan_001.h5', cardInfoAvailable: true }],
      }),
      getCardInfo: vi.fn().mockRejectedValue(new Error('backend unavailable')),
    })

    render(<FileBrowser {...props} />)
    await waitFor(() => screen.getByText('scan_001.h5'))
    await waitFor(() => expect(props.getCardInfo).toHaveBeenCalled())
    // No assertion needed beyond "didn't throw" — the component stays functional
  })

  it('remounts same-named file rows when the directory path changes', () => {
    const listing: DirectoryListing = {
      directories: [],
      files: [{ name: 'scan_001.h5', cardInfoAvailable: true }],
    }
    const observeCard = vi.fn()
    const baseProps = {
      listing,
      navigating: false,
      navError: null,
      activeFile: null,
      cardInfo: {},
      onNavigate: vi.fn(),
      onFileClick: vi.fn(),
      observeCard,
    }

    const { rerender } = render(<FileBrowserView {...baseProps} path="" />)
    expect(observeCard).toHaveBeenCalledWith(expect.objectContaining({
      dataset: expect.objectContaining({ filepath: 'scan_001.h5' }),
    }))

    rerender(<FileBrowserView {...baseProps} path="2024-01" />)
    expect(observeCard).toHaveBeenCalledWith(expect.objectContaining({
      dataset: expect.objectContaining({ filepath: '2024-01/scan_001.h5' }),
    }))
  })

  it('ignores a stale navigation result when a newer navigation completes first', async () => {
    const rootListingWithDir: DirectoryListing = { directories: ['dir-a'], files: [] }
    const listingA: DirectoryListing = {
      directories: [],
      files: [{ name: 'file-in-a.h5', cardInfoAvailable: false }],
    }

    let resolveA!: (v: DirectoryListing) => void
    let resolveRootAgain!: (v: DirectoryListing) => void
    const promiseA = new Promise<DirectoryListing>(res => { resolveA = res })
    const promiseRootAgain = new Promise<DirectoryListing>(res => { resolveRootAgain = res })

    const props = makeProps({
      listDirectory: vi.fn()
        .mockResolvedValueOnce(rootListingWithDir) // mount: navigate('') — resolves immediately
        .mockReturnValueOnce(promiseA)             // navigate('dir-a') — stale, seq=2
        .mockReturnValueOnce(promiseRootAgain),    // navigate('') via breadcrumb — newest, seq=3
    })

    render(<FileBrowser {...props} rootLabel="root" />)
    await waitFor(() => expect(screen.getByText('dir-a')).toBeInTheDocument())

    // Start two navigations in quick succession — the breadcrumb root button is
    // always rendered so it's clickable even while navigating=true.
    fireEvent.click(screen.getByText('dir-a'))
    fireEvent.click(screen.getByText('root'))

    // Resolve the newer navigation (seq=3) first — it should commit.
    resolveRootAgain(rootListingWithDir)
    await waitFor(() => expect(screen.getByText('dir-a')).toBeInTheDocument())

    // Resolve the stale navigation (seq=2) — should be a no-op.
    resolveA(listingA)
    await new Promise(r => setTimeout(r, 10))

    expect(screen.queryByText('file-in-a.h5')).not.toBeInTheDocument()
    expect(screen.getByText('dir-a')).toBeInTheDocument()
  })
})
