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
| \`null\` | Empty gray square | Backend returned null (thumbnail unavailable or error) |
| A URL string \`"https://…"\` | The image | Your backend exposes a dedicated image endpoint and returns its URL |
| A base64 string \`"data:image/png;base64,…"\` | The image | Your backend returns raw image bytes (e.g. PNG); your \`getCardInfo\` encodes them before passing here |

The \`null\` vs \`undefined\` distinction matters: \`null\` means the backend tried to
produce a thumbnail but couldn't (file not found, unsupported format, backend error, etc.)
and no image will ever arrive. \`undefined\` means thumbnails are not part of the design for
these files at all, so a generic file icon is shown instead.

The image is displayed in a fixed 48 × 48 px box and cropped to fit — original image
dimensions don't matter.

**If your backend returns raw image bytes** (e.g. PNG bytes over a REST API), you cannot
pass them directly. Your \`getCardInfo\` function must encode them into a base64 data URI
string first. In JavaScript that looks like:

\`\`\`ts
// response.data is a Uint8Array / ArrayBuffer of PNG bytes from your backend
const base64 = btoa(String.fromCharCode(...new Uint8Array(response.data)));
const thumbnail = \`data:image/png;base64,\${base64}\`;
\`\`\`

Or with axios (set \`responseType: 'arraybuffer'\` on the request):

\`\`\`ts
const response = await axios.get('/thumbnail/scan_001.h5', { responseType: 'arraybuffer' });
const base64 = btoa(String.fromCharCode(...new Uint8Array(response.data)));
return { thumbnail: \`data:image/png;base64,\${base64}\` };
\`\`\`

**Note:** the gray placeholder also appears transiently while \`getCardInfo\` is still
in flight — before the promise resolves, \`FileBrowserView\` coerces the not-yet-loaded
value to \`null\` internally. This is a brief loading flicker, not a permanent state.
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
      description: { story: '`thumbnail` is any string valid as `img src` — a `data:image/png;base64,…` URI if your backend returns raw bytes, or a URL if your backend exposes a thumbnail endpoint. The image is displayed in a fixed 48 × 48 px slot with `object-cover` cropping.' },
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
      description: { story: '`thumbnail={null}` — the backend returned null, meaning no thumbnail is available (file not found, unsupported format, or backend error). The slot renders as an empty gray square rather than a file icon, signalling that thumbnails are in use for this file type even though this one couldn\'t be produced.' },
    },
  },
  args: {
    filename: 'scan_001.h5',
    tag: 'hdf5',
    subtitle: '100 × 100 stxm scan',
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

export const SmallIcon: Story = {
  parameters: {
    docs: {
      description: { story: '`iconSize="sm"` renders a 32 × 32 px slot. Useful in compact panels or narrow sidebars where card height matters more than thumbnail detail.' },
    },
  },
  render: (args) => (
    <div className="w-72">
      <FileCard {...args} />
    </div>
  ),
  args: {
    filename: 'scan_001.h5',
    tag: 'stxm',
    subtitle: '100 × 100 energy scan',
    detail: '(100, 100, 512)',
    thumbnail: fakeThumbnail,
    iconSize: 'sm',
  },
};

export const LargeIcon: Story = {
  parameters: {
    docs: {
      description: { story: '`iconSize="lg"` renders a 64 × 64 px slot. Use this when your backend returns 64 px thumbnails so the image fills the slot without upscaling.' },
    },
  },
  render: (args) => (
    <div className="w-72">
      <FileCard {...args} />
    </div>
  ),
  args: {
    filename: 'scan_001.h5',
    tag: 'stxm',
    subtitle: '100 × 100 energy scan',
    detail: '(100, 100, 512)',
    thumbnail: fakeThumbnail,
    iconSize: 'lg',
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
