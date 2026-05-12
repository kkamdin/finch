import type { Meta, StoryObj } from '@storybook/react';
import FileCard from '../components/FileBrowser/FileCard';

// Inline SVG placeholder — no external request needed
const fakeThumbnail =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E" +
  "%3Crect width='48' height='48' fill='%230369a1'/%3E" +
  "%3Crect y='16' width='48' height='16' fill='%230ea5e9' opacity='.6'/%3E" +
  "%3C/svg%3E";

const meta = {
  title: 'FileBrowser/FileCard',
  component: FileCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A single row in the file browser. The \`thumbnail\` prop has three distinct states
that let the caller communicate different situations with the same slot:

| Value | What renders | When to use |
|---|---|---|
| omitted / \`undefined\` | Generic file icon | Thumbnails are not in use for this file type |
| \`null\` | Empty gray square | Thumbnails are in use but this one hasn't loaded yet |
| \`"https://…"\` | The image | Thumbnail URL is available |

The \`null\` vs \`undefined\` distinction matters: \`null\` tells the card to reserve space
for a thumbnail and show a placeholder, which prevents the layout from jumping when the
URL arrives. \`undefined\` means thumbnails are not part of the design for these files at
all, so a generic file icon is shown instead.

When \`FileBrowser\` fetches card info via \`getCardInfo\`, it passes whatever the backend
returns for \`thumbnail\` — \`null\` if the backend signals "not ready yet", a URL string
once it is available, or the prop is simply omitted for file types that don't have thumbnails.
        `,
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: { story: '`thumbnail` is omitted (i.e. `undefined`). The card shows a generic file icon, signalling that thumbnails are not in use for this file type.' },
    },
  },
  args: {
    filename: 'scan_001.h5',
  },
};

export const WithTagAndSubtitle: Story = {
  args: {
    filename: 'scan_001.h5',
    tag: 'hdf5',
    subtitle: '100 × 100 stxm scan',
    detail: '(100, 100, 512)',
  },
};

export const WithThumbnail: Story = {
  parameters: {
    docs: {
      description: { story: '`thumbnail` is a URL string — the image fills the icon slot. The backend supplies this URL once the thumbnail is ready.' },
    },
  },
  args: {
    filename: 'scan_001.h5',
    tag: 'hdf5',
    subtitle: '100 × 100 stxm scan',
    thumbnail: fakeThumbnail,
  },
};

export const ThumbnailPlaceholder: Story = {
  parameters: {
    docs: {
      description: { story: '`thumbnail` is `null` — the slot renders as an empty gray square. This signals "a thumbnail belongs here but the URL hasn\'t loaded yet", which keeps the layout stable when the URL arrives later rather than the card jumping from icon → image.' },
    },
  },
  args: {
    filename: 'scan_001.h5',
    tag: 'hdf5',
    subtitle: 'thumbnail pending…',
    thumbnail: null,
  },
};

export const Active: Story = {
  parameters: {
    docs: {
      description: { story: '`isActive` is set by `FileBrowser` when this file is the currently loaded one.' },
    },
  },
  args: {
    filename: 'scan_001.h5',
    tag: 'hdf5',
    subtitle: '100 × 100 stxm scan',
    isActive: true,
  },
};

export const NoIcon: Story = {
  parameters: {
    docs: {
      description: { story: '`showIcon={false}` gives a compact single-line layout without the 48 px icon slot.' },
    },
  },
  args: {
    filename: 'scan_001.h5',
    tag: 'hdf5',
    subtitle: '100 × 100 stxm scan',
    showIcon: false,
  },
};

export const LongFilename: Story = {
  parameters: {
    docs: {
      description: { story: 'Rendered inside a `w-72` container matching the FileBrowser panel width. Without a width constraint the card would expand and `truncate` would never fire.' },
    },
  },
  render: (args) => (
    <div className="w-72">
      <FileCard {...args} />
    </div>
  ),
  args: {
    filename: 'this_is_a_very_long_filename_that_truncates_gracefully_with_ellipsis.h5',
    tag: 'hdf5',
    subtitle: 'long name test',
  },
};
