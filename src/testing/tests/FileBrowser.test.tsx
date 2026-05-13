import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FileBrowser from '../../components/FileBrowser/FileBrowser';
import type { DirectoryListing, CardInfo } from '../../components/FileBrowser/FileBrowserView';

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
})
