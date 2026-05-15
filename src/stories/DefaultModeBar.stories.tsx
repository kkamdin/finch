import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { DefaultModeBar } from '../components/PlotlyHeatmap';
import type { ModeBarRenderProps } from '../components/PlotlyHeatmap';

const meta = {
    title: 'General Components/DefaultModeBar',
    component: DefaultModeBar,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
} satisfies Meta<typeof DefaultModeBar>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderWithState(args: ModeBarRenderProps) {
    const [dragMode, setDragMode] = useState<'zoom' | 'pan' | false>(args.dragMode);
    return <DefaultModeBar {...args} dragMode={dragMode} onModeChange={setDragMode} />;
}

export const Default: Story = {
    render: renderWithState,
    args: {
        dragMode: false,
        onModeChange: () => {},
        onResetView: () => {},
    },
};

export const ZoomActive: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Toolbar with zoom mode pre-selected.',
            },
        },
    },
    render: renderWithState,
    args: {
        dragMode: 'zoom',
        onModeChange: () => {},
        onResetView: () => {},
    },
};

export const PanActive: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Toolbar with pan mode pre-selected.',
            },
        },
    },
    render: renderWithState,
    args: {
        dragMode: 'pan',
        onModeChange: () => {},
        onResetView: () => {},
    },
};
