import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import FileBrowserView from '../components/FileBrowser/FileBrowserView';
import type {
  FileBrowserViewProps,
  DirectoryListing,
  CardInfo,
  FileEntry,
} from '../components/FileBrowser/FileBrowserView';

const meta = {
  title: 'FileBrowser/FileBrowserView',
  component: FileBrowserView,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**Most apps should import \`FileBrowser\`, not this component** — see below for when \`FileBrowserView\` is the right choice.

---

### How the two components relate

\`FileBrowser\` and \`FileBrowserView\` form a **container/view pair** — a common React pattern sometimes called the "presenter/container split" or "smart vs. dumb components". In classic MVC terms:

| Component | MVC role | What it does |
|---|---|---|
| \`FileBrowser\` | **Controller** | Owns all state, fetches data, coordinates between your data layer and the view |
| \`FileBrowserView\` | **View** | Renders whatever state it receives as props — no fetching, no internal navigation state |

\`FileBrowser\` wraps \`FileBrowserView\` internally. You never need both.

---

### Which one should I import?

**Import \`FileBrowser\`** for the vast majority of use cases:

\`\`\`tsx
import { FileBrowser } from '@blueskyproject/finch'

<FileBrowser
  listDirectory={myApi.listDirectory}
  getCardInfo={myApi.getCardInfo}
  onLoadFile={path => openFile(path)}
/>
\`\`\`

It manages navigation state, lazy card-info fetching (only visible cards are
fetched, using the browser's IntersectionObserver API), and active-file
tracking automatically.

**Import \`FileBrowserView\`** only when you need to own the state yourself:

- **URL-synced navigation** — store \`path\` in \`useSearchParams\` (React Router) so the browser back button navigates the file browser
- **Shared store** — hold \`path\` and \`listing\` in Redux, Zustand, Jotai, etc., so other parts of the UI can read or drive navigation
- **Server-side rendering** — pass a pre-fetched listing directly with no async on the client
- **Isolated testing** — render any state deterministically by passing data as props

The \`filterFn\` prop is only available on \`FileBrowserView\`. It lets the consuming
app apply an external predicate on top of the built-in text and tag filters without
reimplementing the filter bar UI.

*Further reading: search "React container presenter pattern" or "React smart dumb components".*
        `,
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onNavigate: fn(),
    onFileClick: fn(),
    observeCard: fn(),
  },
} satisfies Meta<typeof FileBrowserView>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleListing: DirectoryListing = {
  directories: ['2024-01', '2024-02'],
  files: [
    { name: 'scan_001.h5', card_info_available: true },
    { name: 'scan_002.h5', card_info_available: true },
    { name: 'dark_field.h5', card_info_available: true },
    { name: 'flat_field.h5', card_info_available: false },
  ],
};

const sampleCardInfo: Record<string, CardInfo> = {
  'scan_001.h5': { tag: 'stxm', subtitle: '100 × 100 energy scan', detail: '(100, 100, 512)', thumbnail: null },
  'scan_002.h5': { tag: 'stxm', subtitle: '50 × 50 point scan',   detail: '(50, 50, 256)',   thumbnail: null },
  'dark_field.h5': { tag: 'reference', subtitle: 'dark field calibration', detail: '(100, 100)', thumbnail: null },
};

export const ControlledState: Story = {
  parameters: {
    docs: {
      description: {
        story: `
All state is passed as props — nothing is fetched or managed internally.
In a real app you would hold \`path\`, \`listing\`, \`cardInfo\`, etc. in your own
state manager and pass them here, forwarding \`onNavigate\` and \`onFileClick\`
callbacks to update that state.

Use the **Controls** panel below to toggle \`navigating\`, set \`navError\`, clear
\`listing\`, or change \`activeFile\` to see how the view responds to each state.
        `,
      },
    },
  },
  args: {
    path: '',
    listing: sampleListing,
    navigating: false,
    navError: null,
    activeFile: 'scan_001.h5',
    cardInfo: sampleCardInfo,
    rootLabel: 'data',
  },
};

export const WithExternalFilter: Story = {
  parameters: {
    docs: {
      description: {
        story: `
\`filterFn\` lets the consuming app narrow the file list without reimplementing
the filter bar. It runs before the built-in text and tag filters, so both can
be active at the same time.

In this example the app hides all \`reference\` files (e.g. the current user's
role doesn't include calibration data):

\`\`\`tsx
<FileBrowserView
  filterFn={(file: FileEntry) => cardInfo[file.name]?.tag !== 'reference'}
  {...otherProps}
/>
\`\`\`

This prop is only available on \`FileBrowserView\` — \`FileBrowser\` does not expose it.
        `,
      },
    },
  },
  args: {
    ...ControlledState.args,
    activeFile: null,
    filterFn: (file: FileEntry) => sampleCardInfo[file.name]?.tag !== 'reference',
  },
};

function URLSyncedWrapper(args: FileBrowserViewProps) {
  // In a real app this would be: const [path, setPath] = useSearchParams(...)
  const [path, setPath] = useState(args.path)

  const cardInfo = path
    ? Object.fromEntries(
        Object.entries(sampleCardInfo).map(([k, v]) => [`${path}/${k}`, v])
      )
    : sampleCardInfo

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-400 font-mono">
        path in state: <span className="text-slate-700">{JSON.stringify(path || '(root)')}</span>
      </p>
      <div className="w-72 h-96 border border-slate-200 rounded-lg overflow-hidden">
        <FileBrowserView
          {...args}
          path={path}
          cardInfo={cardInfo}
          onNavigate={subpath => setPath(subpath)}
        />
      </div>
    </div>
  )
}

export const URLSyncedNavigation: Story = {
  parameters: {
    docs: {
      description: {
        story: `
The current path is held in React state (shown above the browser). In a real
app you would replace \`useState\` with \`useSearchParams\`, a store selector, or
any other source of truth — \`FileBrowserView\` doesn't care where the value lives.

\`\`\`tsx
import { FileBrowserView } from '@blueskyproject/finch'

function FileBrowserPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const path = searchParams.get('path') ?? ''

  return (
    <FileBrowserView
      path={path}
      listing={listing}          // from your data layer
      cardInfo={cardInfo}        // from your data layer
      navigating={isFetching}
      navError={error?.message ?? null}
      activeFile={activeFile}
      onNavigate={subpath => setSearchParams({ path: subpath })}
      onFileClick={onLoadFile}
      observeCard={observeCard}  // from your IntersectionObserver logic
    />
  )
}
\`\`\`
        `,
      },
    },
  },
  render: (args) => <URLSyncedWrapper {...args} />,
  args: {
    ...ControlledState.args,
    activeFile: null,
  },
};
