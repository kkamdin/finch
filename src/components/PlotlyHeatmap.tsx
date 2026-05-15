import React, { useRef, useEffect, useState, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { cn } from '@/lib/utils';
import ButtonIconOnly from './ButtonIconOnly';
import { ArrowsOutCardinal, Cursor, HouseLine, MagnifyingGlassPlus } from '@phosphor-icons/react';

export type ModeBarRenderProps = {
    /** Current Plotly drag mode, controlled externally via the dragMode prop */
    dragMode: 'zoom' | 'pan' | false;
    /** Set the active interaction mode. Pass `false` to return to the default cursor (no drag interaction). */
    onModeChange: (mode: 'zoom' | 'pan' | false) => void;
    /** Reset the plot view to its default zoom/pan state */
    onResetView: () => void;
}

export type PlotlyHeatmapProps = {
    /** A nested array displayed top-down */
    array: number[][],
    /** The plot title */
    title?: string,
    /** x axis title, adds padding to bottom */
    xAxisTitle?: string,
    /** y axis title, adds padding to left */
    yAxisTitle?: string,
    /** Plotly specific colorscales */
    colorScale?: 'Viridis' | 'YlOrRd' | 'Cividis' | 'Hot' | 'Electric' | 'Plasma',
    /** Adjust the height of the plot. ex) a factor of 2 makes each row in the array take up 2 pixels */
    verticalScaleFactor?: number,
    /** Should tick marks show up? */
    showTicks?: boolean,
    /** Spacing between tick marks along data  */
    tickStep?: number,
    /** Should the visual plot be locked to the height of the parent container? */
    lockPlotHeightToParent?: boolean,
    /** Should each data point be locked in to an exact pixel? Don't use this with 'lockPlotHeightToParent' */
    lockPlotWidthHeightToInputArray?: boolean,
    /** Should the color scale show up? it will take up some space to the right of the plot */
    showScale?: boolean,
    /** Flip y axis */
    flipYAxis?: boolean
    /** Additional CSS classes applied to the root container. */
    className?: string;
    /** Minimum value mapped to the bottom of the colorscale. Defaults to Plotly auto-scale. */
    zmin?: number;
    /** Maximum value mapped to the top of the colorscale. Defaults to Plotly auto-scale. */
    zmax?: number;
    /** Plotly dragmode for the plot. */
    dragMode?: 'zoom' | 'pan' | false;
    /**
     * Called when the user changes the interaction mode. `false` means cursor/default (no drag).
     *
     * Note: `onSelected` (Plotly's box-select ROI event) is intentionally not exposed here.
     * Plotly owns the selection handles in the DOM and there is no supported way to clear them
     * from a React component without importing plotly.js directly alongside react-plotly.js
     * (duplicate bundle weight + Node.js shim issues). If you need ROI selection, use a
     * canvas-based component where your app owns the ROI state entirely.
     */
    onDragModeChange?: (mode: 'zoom' | 'pan' | false) => void;
    /** Plotly shape objects drawn on top of the heatmap in data coordinates. */
    shapes?: any[];
    /**
     * Where to render the zoom/pan/home toolbar.
     * 'overlay' (default): Plotly's native modebar floats over the top-right corner on hover.
     * 'above': hides the native modebar and renders a compact toolbar above the plot.
     */
    modeBar?: 'overlay' | 'above';
    /**
     * Render prop for a fully custom toolbar. Only active when modeBar='above'.
     * Receives current mode state and callbacks — use with ButtonIconOnly for consistent styling.
     * When omitted, a default zoom/pan/select/reset toolbar is rendered.
     */
    renderModeBar?: (props: ModeBarRenderProps) => React.ReactNode;
}

/** Default zoom/pan/cursor/reset toolbar rendered when modeBar='above' and no renderModeBar is provided. */
export function DefaultModeBar({ dragMode, onModeChange, onResetView }: ModeBarRenderProps) {
    return (
        <>
            <div role="radiogroup" aria-label="Interaction mode" className="flex gap-0.5">
                <ButtonIconOnly
                    title="Cursor"
                    isSecondary
                    active={dragMode === false}
                    onClick={() => onModeChange(false)}
                    icon={<Cursor size={16} />}
                />
                <ButtonIconOnly
                    title="Zoom"
                    isSecondary
                    active={dragMode === 'zoom'}
                    onClick={() => onModeChange('zoom')}
                    icon={<MagnifyingGlassPlus size={16} />}
                />
                <ButtonIconOnly
                    title="Pan"
                    isSecondary
                    active={dragMode === 'pan'}
                    onClick={() => onModeChange('pan')}
                    icon={<ArrowsOutCardinal size={16} />}
                />
            </div>
            <ButtonIconOnly
                title="Reset view"
                isSecondary
                onClick={onResetView}
                icon={<HouseLine size={16} />}
            />
        </>
    );
}

/**
 * A 2D heatmap rendered with Plotly. Supports zoom/pan, colorscales,
 * optional axis labels, and a customisable toolbar.
 *
 * The component fills its parent container. Give the parent an explicit height
 * (e.g. `h-96`) or use `lockPlotHeightToParent` to match the container's height,
 * or rely on `verticalScaleFactor` to derive height from the array row count.
 *
 * `onSelected` (Plotly's box-select ROI event) is intentionally not exposed.
 * Plotly owns the selection handles in the DOM and there is no supported way to clear
 * them from a React component without importing plotly.js directly alongside
 * react-plotly.js (duplicate bundle weight + Node.js shim issues). If you need ROI
 * selection, use a canvas-based component where your app owns the ROI state entirely.
 */
export default function PlotlyHeatmap({
    array,
    title = '',
    xAxisTitle = '',
    yAxisTitle = '',
    colorScale = 'Viridis',
    verticalScaleFactor = 0.1,
    showTicks = false,
    tickStep = 100,
    showScale = true,
    lockPlotHeightToParent=false,
    lockPlotWidthHeightToInputArray=false,
    flipYAxis = true,
    className,
    zmin,
    zmax,
    dragMode = 'zoom',
    onDragModeChange,
    shapes,
    modeBar = 'overlay',
    renderModeBar,
}: PlotlyHeatmapProps) {
    const plotContainer = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 }); //applied to plot, not the container
    // Internal zoom/pan/cursor state used when modeBar='above'. false = cursor (no drag).
    const [internalMode, setInternalMode] = useState<'zoom' | 'pan' | false>(false);
    // Explicit zoom ranges captured from onRelayout. Empty = use defaults. Cleared by reset view.
    const [zoomRanges, setZoomRanges] = useState<{ x?: [number, number]; y?: [number, number] }>({});

    const handleRelayout = useCallback((event: any) => {
        const hasX = event['xaxis.range[0]'] !== undefined;
        const hasY = event['yaxis.range[0]'] !== undefined;
        if (hasX || hasY) {
            setZoomRanges(prev => ({
                x: hasX ? [event['xaxis.range[0]'], event['xaxis.range[1]']] : prev.x,
                y: hasY ? [event['yaxis.range[0]'], event['yaxis.range[1]']] : prev.y,
            }));
        } else if (event['xaxis.autorange'] || event['yaxis.autorange']) {
            setZoomRanges({});
        }
    }, []);

    const handleModeChange = useCallback((mode: 'zoom' | 'pan' | false) => {
        setInternalMode(mode);
        onDragModeChange?.(mode);
    }, [onDragModeChange]);

    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setDimensions({ width, height });
            }
        });
        if (plotContainer.current) {
            resizeObserver.observe(plotContainer.current);
        }
        return () => resizeObserver.disconnect();
    }, []);

    const dynamicHeight = Math.max(array.length * verticalScaleFactor, 0);

    return (
        <>
            {modeBar === 'above' && (
                <div className="flex items-center gap-0.5 px-1 py-0.5 border-b border-slate-200">
                    {renderModeBar
                        ? renderModeBar({
                            dragMode,
                            onModeChange: handleModeChange,
                            onResetView: () => setZoomRanges({}),
                          })
                        : <DefaultModeBar
                            dragMode={internalMode}
                            onModeChange={handleModeChange}
                            onResetView={() => setZoomRanges({})}
                          />
                    }
                </div>
            )}
            <div className={cn(`h-full w-full rounded-b-md flex relative`, className)} ref={plotContainer}>
                <div className="flex-1 flex flex-col">
                    <Plot
                        data={[
                            {
                                z: array,
                                type: 'heatmap',
                                colorscale: colorScale,
                                zmin: zmin,
                                zmax: zmax,
                                showscale: showScale,
                            }
                        ]}
                        layout={{
                            title: {
                                text: title,
                            },
                            xaxis: {
                                title: xAxisTitle,
                                automargin: false,
                                showticklabels: showTicks,
                                showgrid: showTicks,
                                range: zoomRanges.x ?? [-0.5, (array[0]?.length ?? 1) - 0.5],
                                autorange: false,
                            },
                            yaxis: {
                                title: yAxisTitle,
                                range: zoomRanges.y ?? (flipYAxis ? [array.length - 0.5, -0.5] : [-0.5, array.length - 0.5]),
                                autorange: false,
                                automargin: false,
                                tickmode: showTicks ? 'linear' : undefined,
                                tick0: 0,
                                dtick: showTicks ? tickStep : 10000,
                                showticklabels: showTicks,
                                showgrid: showTicks
                            },
                            dragmode: modeBar === 'above' ? internalMode : dragMode,
                            shapes: shapes ?? [],
                            autosize: true,
                            width: lockPlotWidthHeightToInputArray ? Math.min(dimensions.width, array[0].length) : dimensions.width,
                            height: lockPlotWidthHeightToInputArray ? Math.min(dimensions.height, array.length) : lockPlotHeightToParent ? dimensions.height : dynamicHeight,
                            margin: {
                                l: (showTicks || yAxisTitle) ? 50 : 0,
                                r: 0,
                                t: 0,
                                b: xAxisTitle ? 40 : 0,
                            },
                        }}
                        config={{ responsive: true, displayModeBar: modeBar === 'above' ? false : 'hover' }}
                        onRelayout={handleRelayout}
                        className="rounded-b-md flex-1"
                    />
                    <div className="absolute bottom-0 left-0 right-0 text-center text-md font-semibold">
                        {title}
                    </div>
                </div>
            </div>
        </>
    );
}