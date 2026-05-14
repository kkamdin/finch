import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import PlotlyHeatmap from '../components/PlotlyHeatmap';

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

export const LogScale: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Enable `enableLogScale` to show a log/gamma intensity slider above the plot, useful for data with a wide dynamic range.',
            },
        },
    },
    args: {
        array: eggData,
        lockPlotHeightToParent: true,
        enableLogScale: true,
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
