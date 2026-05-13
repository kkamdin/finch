import type { Meta, StoryObj } from '@storybook/react';
import FileCard from '../components/FileBrowser/FileCard';

// for display example placeholder
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
