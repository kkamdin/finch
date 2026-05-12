import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FileBrowserView from '../../components/FileBrowser/FileBrowserView';
import type { DirectoryListing, CardInfo } from '../../components/FileBrowser/FileBrowserView';

const listing: DirectoryListing = {
  directories: ['subdir'],
  files: [
    { name: 'scan_001.h5', card_info_available: false },
    { name: 'scan_002.h5', card_info_available: true },
  ],
}

const cardInfo: Record<string, CardInfo> = {
  'scan_002.h5': { tag: 'hdf5', subtitle: '100 × 100', detail: '(100, 100, 512)', thumbnail: null },
}

const noop = () => {}

function renderPresenter(overrides: Partial<React.ComponentProps<typeof FileBrowserView>> = {}) {
  return render(
    <FileBrowserView
      path=""
      listing={listing}
      navigating={false}
      navError={null}
      activeFile={null}
      cardInfo={cardInfo}
      onNavigate={noop}
      onFileClick={noop}
      observeCard={noop}
      {...overrides}
    />
  )
}

describe('FileBrowserView', () => {
  it('renders directory entries', () => {
    renderPresenter()
    expect(screen.getByText('subdir')).toBeInTheDocument()
  })

  it('renders file entries', () => {
    renderPresenter()
    expect(screen.getByText('scan_001.h5')).toBeInTheDocument()
    expect(screen.getByText('scan_002.h5')).toBeInTheDocument()
  })

  it('renders card info fields for files that have them', () => {
    renderPresenter()
    // 'hdf5' appears twice: once as a tag pill and once as a dropdown option
    expect(screen.getAllByText('hdf5').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('100 × 100')).toBeInTheDocument()
    expect(screen.getByText('(100, 100, 512)')).toBeInTheDocument()
  })

  it('shows loading indicator while navigating', () => {
    renderPresenter({ navigating: true, listing: null })
    expect(screen.getByText('loading…')).toBeInTheDocument()
  })

  it('shows the nav error message when navError is set', () => {
    renderPresenter({ navError: 'Not found' })
    expect(screen.getByText('Not found')).toBeInTheDocument()
  })

  it('shows "Empty directory" when listing has no entries', () => {
    renderPresenter({ listing: { directories: [], files: [] } })
    expect(screen.getByText('Empty directory')).toBeInTheDocument()
  })

  it('shows "No files match" message when external filterFn excludes all files', () => {
    // Must use a listing with no directories — the empty-state message only
    // renders when both directories and visibleFiles are empty.
    renderPresenter({
      listing: { directories: [], files: [{ name: 'scan_001.h5', card_info_available: false }] },
      filterFn: () => false,
    })
    expect(screen.getByText('No files match the current filter')).toBeInTheDocument()
  })

  it('calls onNavigate with the directory subpath when a directory is clicked', () => {
    const onNavigate = vi.fn()
    renderPresenter({ onNavigate })
    fireEvent.click(screen.getByText('subdir'))
    expect(onNavigate).toHaveBeenCalledWith('subdir')
  })

  it('calls onNavigate with the full subpath when inside a subdirectory', () => {
    const onNavigate = vi.fn()
    renderPresenter({ path: 'parent', onNavigate })
    fireEvent.click(screen.getByText('subdir'))
    expect(onNavigate).toHaveBeenCalledWith('parent/subdir')
  })

  it('calls onFileClick with the filename when a file is clicked', () => {
    const onFileClick = vi.fn()
    renderPresenter({ onFileClick })
    fireEvent.click(screen.getByText('scan_001.h5'))
    expect(onFileClick).toHaveBeenCalledWith('scan_001.h5')
  })

  it('renders breadcrumb segments for a nested path', () => {
    renderPresenter({ path: 'a/b' })
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  it('navigates to a breadcrumb segment when clicked', () => {
    const onNavigate = vi.fn()
    renderPresenter({ path: 'a/b', onNavigate })
    fireEvent.click(screen.getByText('a'))
    expect(onNavigate).toHaveBeenCalledWith('a')
  })

  it('navigates to root when the root label button is clicked', () => {
    const onNavigate = vi.fn()
    renderPresenter({ rootLabel: 'data-root', onNavigate })
    fireEvent.click(screen.getByText('data-root'))
    expect(onNavigate).toHaveBeenCalledWith('')
  })

  it('shows the tag dropdown when cardInfo contains tags', () => {
    renderPresenter()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('hides the tag dropdown when no tags have loaded', () => {
    renderPresenter({ cardInfo: {} })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('filters file list by text input', () => {
    renderPresenter()
    fireEvent.change(screen.getByPlaceholderText('filter file names…'), { target: { value: '001' } })
    expect(screen.getByText('scan_001.h5')).toBeInTheDocument()
    expect(screen.queryByText('scan_002.h5')).not.toBeInTheDocument()
  })

  it('hides icon slots on all cards when showIcon is false', () => {
    const { container } = renderPresenter({ showIcon: false })
    expect(container.querySelector('.w-12')).not.toBeInTheDocument()
  })

  it('renders null when listing is null and not navigating', () => {
    renderPresenter({ listing: null })
    expect(screen.queryByText('subdir')).not.toBeInTheDocument()
  })
})
