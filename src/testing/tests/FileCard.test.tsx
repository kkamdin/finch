import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FileCard from '../../components/FileBrowser/FileCard';

describe('FileCard', () => {
  it('renders the filename', () => {
    render(<FileCard filename="scan_001.h5" />)
    expect(screen.getByText('scan_001.h5')).toBeInTheDocument()
  })

  it('renders the tag pill when tag is a non-empty string', () => {
    render(<FileCard filename="f.h5" tag="hdf5" />)
    expect(screen.getByText('hdf5')).toBeInTheDocument()
  })

  it('does not render a tag pill when tag is null', () => {
    render(<FileCard filename="f.h5" tag={null} />)
    expect(screen.queryByText(/hdf5/)).not.toBeInTheDocument()
  })

  it('renders subtitle text', () => {
    render(<FileCard filename="f.h5" subtitle="100 × 100 scan" />)
    expect(screen.getByText('100 × 100 scan')).toBeInTheDocument()
  })

  it('renders detail text', () => {
    render(<FileCard filename="f.h5" detail="(100, 100, 512)" />)
    expect(screen.getByText('(100, 100, 512)')).toBeInTheDocument()
  })

  it('renders a thumbnail image when thumbnail is a URL string', () => {
    const { container } = render(<FileCard filename="f.h5" thumbnail="https://example.com/thumb.png" />)
    // alt="" makes this presentational, so query directly rather than by role
    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.png')
  })

  it('renders no img element when thumbnail is null (gray placeholder)', () => {
    render(<FileCard filename="f.h5" thumbnail={null} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders a file icon SVG when thumbnail is undefined', () => {
    const { container } = render(<FileCard filename="f.h5" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('hides the icon slot entirely when showIcon is false', () => {
    const { container } = render(<FileCard filename="f.h5" thumbnail="https://example.com/thumb.png" showIcon={false} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('.w-12')).not.toBeInTheDocument()
  })

  it('applies active background class when isActive is true', () => {
    const { container } = render(<FileCard filename="f.h5" isActive />)
    expect(container.firstChild).toHaveClass('bg-sky-50')
    expect(container.firstChild).not.toHaveClass('bg-white')
  })

  it('applies default background class when not active', () => {
    const { container } = render(<FileCard filename="f.h5" />)
    expect(container.firstChild).toHaveClass('bg-white')
    expect(container.firstChild).not.toHaveClass('bg-sky-50')
  })

  it('applies active text color to the filename when active', () => {
    render(<FileCard filename="f.h5" isActive />)
    expect(screen.getByText('f.h5')).toHaveClass('text-sky-900')
    expect(screen.getByText('f.h5')).not.toHaveClass('text-slate-800')
  })

  it('applies default text color to the filename when not active', () => {
    render(<FileCard filename="f.h5" />)
    expect(screen.getByText('f.h5')).toHaveClass('text-slate-900')
    expect(screen.getByText('f.h5')).not.toHaveClass('text-sky-900')
  })

  it('sets aria-pressed to true when isActive is true', () => {
    render(<FileCard filename="f.h5" isActive={true} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('sets aria-pressed to false when isActive is false', () => {
    render(<FileCard filename="f.h5" isActive={false} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('omits aria-pressed when isActive is not provided', () => {
    render(<FileCard filename="f.h5" />)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed')
  })

  it('renders md-sized icon slot by default', () => {
    const { container } = render(<FileCard filename="f.h5" />)
    expect(container.querySelector('.w-12.h-12')).toBeInTheDocument()
  })

  it('renders sm-sized icon slot when iconSize="sm"', () => {
    const { container } = render(<FileCard filename="f.h5" iconSize="sm" />)
    expect(container.querySelector('.w-8.h-8')).toBeInTheDocument()
    expect(container.querySelector('.w-12')).not.toBeInTheDocument()
  })

  it('renders lg-sized icon slot when iconSize="lg"', () => {
    const { container } = render(<FileCard filename="f.h5" iconSize="lg" />)
    expect(container.querySelector('.w-16.h-16')).toBeInTheDocument()
    expect(container.querySelector('.w-12')).not.toBeInTheDocument()
  })

  it('calls onClick when the card is clicked', () => {
    const onClick = vi.fn()
    render(<FileCard filename="f.h5" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders without crashing when no optional props are provided', () => {
    const { container } = render(<FileCard filename="f.h5" />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
