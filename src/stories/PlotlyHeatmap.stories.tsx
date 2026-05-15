import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import PlotlyHeatmap, { DefaultModeBar } from '../components/PlotlyHeatmap';
import type { ModeBarRenderProps } from '../components/PlotlyHeatmap';

const meta = {
    title: 'General Components/PlotlyHeatmap',
    component: PlotlyHeatmap,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div style={{ width: '400px', height: '400px' }}>
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof PlotlyHeatmap>;

export default meta;
type Story = StoryObj<typeof meta>;

function generateEggData(size: number): number[][] {
    const maxVal = 255;
    const center = size / 2;
    const data: number[][] = [];

    for (let y = 0; y < size; y++) {
        const row: number[] = [];
        for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const intensity = maxVal * Math.exp(-distance * distance / (2 * (center / 2) ** 2));
            row.push(Math.round(intensity));
        }
        data.push(row);
    }

    return data;
}

const eggData = generateEggData(50);

export const Default: Story = {
    args: {
        array: eggData,
        lockPlotHeightToParent: true,
    },
};

export const Electric: Story = {
    parameters: {
        docs: {
            description: {
                story: 'The Electric colorscale maps low values to dark blue and high values to bright yellow-white.',
            },
        },
    },
    args: {
        array: eggData,
        lockPlotHeightToParent: true,
        colorScale: 'Electric',
    },
};

export const HeatmapOnly: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Hide the colorscale sidebar with `showScale={false}` for a cleaner look when the exact values are not important.',
            },
        },
    },
    args: {
        array: [[1, 20, 30], [20, 1, 60]],
        lockPlotHeightToParent: true,
        showScale: false,
    },
};

export const Labels: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Axis titles add automatic margin so labels are never clipped.',
            },
        },
    },
    args: {
        array: [[1, 20, 30], [20, 1, 60], [30, 60, 1]],
        lockPlotHeightToParent: true,
        xAxisTitle: 'X axis title',
        yAxisTitle: 'Y axis title',
    },
};

export const ModeBarAbove: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Set `modeBar="above"` to replace Plotly\'s hover-overlay toolbar with a persistent zoom/pan/reset bar above the plot.',
            },
        },
    },
    args: {
        array: eggData,
        lockPlotHeightToParent: true,
        modeBar: 'above',
    },
};

export const ModeBarCustom: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Use `renderModeBar` to supply a fully custom toolbar. `DefaultModeBar` can be composed inside your render prop so you keep the built-in buttons and add your own alongside them.',
            },
        },
    },
    render: (args) => {
        const [dragMode, setDragMode] = useState<'zoom' | 'pan' | false>(false);
        return (
            <PlotlyHeatmap
                {...args}
                dragMode={dragMode}
                onDragModeChange={setDragMode}
                renderModeBar={(props: ModeBarRenderProps) => (
                    <>
                        <DefaultModeBar {...props} />
                        <span className="text-xs text-slate-500 px-2 self-center">custom toolbar</span>
                    </>
                )}
            />
        );
    },
    args: {
        array: eggData,
        lockPlotHeightToParent: true,
        modeBar: 'above',
    },
};

