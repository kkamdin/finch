import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import FileBrowser from '../components/FileBrowser/FileBrowser';
import type { DirectoryListing, CardInfo } from '../components/FileBrowser/FileBrowserView';

const meta = {
  title: 'FileBrowser/FileBrowser',
  component: FileBrowser,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FileBrowser>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Mock filesystem ──────────────────────────────────────────────────────────

const FS: Record<string, DirectoryListing> = {
  '': {
    directories: ['2024-01', '2024-02'],
    files: [{ name: 'README.txt', card_info_available: false }],
  },
  '2024-01': {
    directories: ['energy-scan'],
    files: [
      { name: 'scan_001.h5', card_info_available: true },
      { name: 'scan_002.h5', card_info_available: true },
      { name: 'dark_field.h5', card_info_available: true },
    ],
  },
  '2024-01/energy-scan': {
    directories: [],
    files: [
      { name: 'escan_001.h5', card_info_available: true },
      { name: 'escan_002.h5', card_info_available: true },
    ],
  },
  '2024-02': {
    directories: [],
    files: [
      { name: 'scan_010.h5', card_info_available: true },
    ],
  },
};

// Inline SVG used as a stand-in for real thumbnails — no external request needed.
// Each scan gets a slightly different hue so you can tell them apart in the story.
function fakeThumbnail(hue: number) {
  return (
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E` +
    `%3Crect width='64' height='64' fill='hsl(${hue}%2C60%25%2C35%25)'/%3E` +
    `%3Crect y='20' width='64' height='24' fill='hsl(${hue}%2C80%25%2C65%25)' opacity='.7'/%3E` +
    `%3C/svg%3E`
  )
}

const CARD_INFO: Record<string, CardInfo> = {
  '2024-01/scan_001.h5':         { tag: 'stxm', subtitle: '100 × 100 energy scan', detail: '(100, 100, 512)', thumbnail: null },
  '2024-01/scan_002.h5':         { tag: 'stxm', subtitle: '50 × 50 point scan',   detail: '(50, 50, 256)',   thumbnail: null },
  '2024-01/dark_field.h5':       { tag: 'reference', subtitle: 'dark field',       detail: '(100, 100)',      thumbnail: null },
  '2024-01/energy-scan/escan_001.h5': { tag: 'stxm', subtitle: '200-eV sweep',    detail: '(1, 200)',        thumbnail: null },
  '2024-01/energy-scan/escan_002.h5': { tag: 'stxm', subtitle: '150-eV sweep',    detail: '(1, 150)',        thumbnail: null },
  '2024-02/scan_010.h5':         { tag: 'stxm', subtitle: '80 × 80 scan',         detail: '(80, 80, 256)',   thumbnail: null },
};

async function mockListDirectory(subpath: string): Promise<DirectoryListing> {
  await new Promise(r => setTimeout(r, 200))
  if (!(subpath in FS)) throw new Error(`Directory not found: ${subpath}`)
  return FS[subpath]
}

async function mockGetCardInfo(subpath: string): Promise<CardInfo> {
  await new Promise(r => setTimeout(r, 300))
  return CARD_INFO[subpath] ?? {}
}

const THUMBNAILS: Record<string, string> = {
  '2024-01/scan_001.h5':              fakeThumbnail(200),
  '2024-01/scan_002.h5':              fakeThumbnail(260),
  '2024-01/dark_field.h5':            fakeThumbnail(30),
  '2024-01/energy-scan/escan_001.h5': fakeThumbnail(160),
  '2024-01/energy-scan/escan_002.h5': fakeThumbnail(140),
  '2024-02/scan_010.h5':              fakeThumbnail(300),
}

async function mockGetCardInfoWithThumbs(subpath: string): Promise<CardInfo> {
  await new Promise(r => setTimeout(r, 300))
  return { ...(CARD_INFO[subpath] ?? {}), thumbnail: THUMBNAILS[subpath] ?? null }
}

// ── Stories ──────────────────────────────────────────────────────────────────

function FileBrowserDemo(args: React.ComponentProps<typeof FileBrowser>) {
  const [loadedFile, setLoadedFile] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <div className="w-72 h-96 border border-slate-200 rounded-lg overflow-hidden">
        <FileBrowser {...args} onLoadFile={path => setLoadedFile(path)} />
      </div>
      {loadedFile && (
        <p className="text-xs text-slate-500 font-mono">Loaded: {loadedFile}</p>
      )}
    </div>
  )
}

export const Default: Story = {
  render: (args) => <FileBrowserDemo {...args} />,
  args: {
    listDirectory: mockListDirectory,
    getCardInfo: mockGetCardInfo,
    onLoadFile: () => {},
    rootLabel: 'data',
  },
};

export const NoIcon: Story = {
  parameters: {
    docs: {
      description: { story: '`showIcon={false}` gives a compact single-line list layout, useful in narrow sidebars.' },
    },
  },
  render: (args) => <FileBrowserDemo {...args} />,
  args: {
    ...Default.args,
    showIcon: false,
  },
};

export const CustomRootLabel: Story = {
  parameters: {
    docs: {
      description: { story: '`rootLabel` sets the breadcrumb home button text. It has no effect on where navigation starts — the backend controls the real root.' },
    },
  },
  render: (args) => <FileBrowserDemo {...args} />,
  args: {
    ...Default.args,
    rootLabel: 'ALS 11.0.2',
  },
};

export const WithThumbnails: Story = {
  parameters: {
    docs: {
      description: {
        story: `
Thumbnails returned by \`getCardInfo\` are displayed in the icon slot.
\`iconSize="lg"\` expands the slot to 64 × 64 px — match this to the resolution
your backend returns to avoid upscaling or wasted bandwidth.

In a real app your \`getCardInfo\` would fetch bytes from the backend and convert
them to a base64 data URI (see the **FileCard** docs for the conversion pattern).
        `,
      },
    },
  },
  render: (args) => <FileBrowserDemo {...args} />,
  args: {
    ...Default.args,
    iconSize: 'lg',
    getCardInfo: mockGetCardInfoWithThumbs,
  },
};

const ICON_SIZE_LABELS = {
  sm: '32 px — compact',
  md: '48 px — default',
  lg: '64 px — wide panel',
} as const

export const IconSizes: Story = {
  parameters: {
    docs: {
      description: {
        story: `
All three \`iconSize\` values rendered side by side. The slot size applies uniformly
to directory rows and file cards. Navigate into **2024-01** to see thumbnails.

\`iconSize\` is the only thing that changes here — the same \`getCardInfo\` function
and the same filesystem are used for all three panels.
        `,
      },
    },
  },
  render: () => (
    <div className="flex gap-6 items-start flex-wrap">
      {(Object.keys(ICON_SIZE_LABELS) as Array<keyof typeof ICON_SIZE_LABELS>).map((size) => (
        <div key={size} className="flex flex-col gap-1">
          <p className="text-xs font-mono text-slate-500 pl-1">
            iconSize=&quot;{size}&quot; &mdash; {ICON_SIZE_LABELS[size]}
          </p>
          <FileBrowserDemo
            listDirectory={mockListDirectory}
            getCardInfo={mockGetCardInfoWithThumbs}
            onLoadFile={() => {}}
            rootLabel="data"
            iconSize={size}
          />
        </div>
      ))}
    </div>
  ),
};

export const ErrorOnLoad: Story = {
  parameters: {
    docs: {
      description: { story: 'When `listDirectory` rejects, the error message is shown in place of the listing.' },
    },
  },
  render: (args) => <FileBrowserDemo {...args} />,
  args: {
    listDirectory: async () => { throw new Error('Failed to connect to backend') },
    getCardInfo: mockGetCardInfo,
    onLoadFile: () => {},
    rootLabel: 'data',
  },
};
