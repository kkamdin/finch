import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { cn } from '@/lib/utils';
import ButtonIconOnly from './ButtonIconOnly';

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
    /** Enable log scale slider control */
    enableLogScale?: boolean,
    /** Flip y axis */
    flipYAxis?: boolean
    /** Additional CSS classes applied to the root container. */
    className?: string;
    /** Additional CSS classes applied to the optional controller panel. */
    classNameControls?: string;
    /** Minimum value mapped to the bottom of the colorscale. Defaults to Plotly auto-scale. */
    zmin?: number;
    /** Maximum value mapped to the top of the colorscale. Defaults to Plotly auto-scale. */
    zmax?: number;
    /** Plotly dragmode for the plot. */
    dragMode?: 'zoom' | 'pan' | false;
    /**
     * Called when the user clicks a mode button in the toolbar (modeBar='above').
     *
     * Why onSelected is not exposed: react-plotly.js provides an onSelected prop (the underlying
     * plotly_selected event) for box-select ROI drawing, but Plotly owns the selection handles in
     * the DOM and there is no supported way to clear them from a React component without importing
     * plotly.js directly alongside react-plotly.js (which causes duplicate bundle weight and
     * Node.js shim issues in browser builds). If you need ROI selection, use PlotlyHeatmap when
     * Plotly's built-in zoom/pan interactions are sufficient and ROI state lives entirely inside
     * Plotly. Use a canvas-based component when your app owns the ROI state and needs to drive
     * what is drawn — Plotly and the caller will fight over the DOM otherwise.
     */
    /** Called when the user changes the interaction mode. `false` means cursor/default (no drag). */
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

/**
 * A 2D heatmap rendered with Plotly. Supports zoom/pan, colorscales, log/gamma
 * intensity scaling, optional axis labels, and a customisable toolbar.
 *
 * The component fills its parent container. Give the parent an explicit height
 * (e.g. `h-96`) or use `lockPlotHeightToParent` to match the container's height,
 * or rely on `verticalScaleFactor` to derive height from the array row count.
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
    enableLogScale = false,
    flipYAxis = true,
    className,
    classNameControls,
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
    const [scaleValue, setScaleValue] = useState<number>(0); // 0 = no scale, 1-10 = increasing scale intensity
    const [debouncedScale, setDebouncedScale] = useState<number>(0);
    const [scaleType, setScaleType] = useState<'log' | 'gamma'>('log'); // Current scale type
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

    // Debounce the scale value to prevent excessive re-renders
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedScale(scaleValue);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [scaleValue]);

    // Apply scaling to the data based on current scale type
    const processedArray = useMemo(() => {
        if (!enableLogScale || debouncedScale === 0) {
            return array;
        }

        if (scaleType === 'log') {
            // Apply log transformation with a base that increases with slider value
            const logBase = 1 + (debouncedScale / 10); // Base ranges from 1.1 to 2.0
            
            return array.map(row => 
                row.map(value => {
                    // Add small epsilon to avoid log(0), then apply log transformation
                    const safeValue = Math.max(value, 0.001);
                    return Math.log(safeValue) / Math.log(logBase);
                })
            );
        } else {
            // Apply gamma correction
            const gamma = 0.1 + (debouncedScale / 10) * 2.9; // Gamma ranges from 0.1 to 3.0
            
            // Find max value efficiently without spread operator
            let maxValue = 0;
            for (const row of array) {
                for (const value of row) {
                    if (value > maxValue) {
                        maxValue = value;
                    }
                }
            }
            
            return array.map(row =>
                row.map(value => {
                    // Normalize to 0-1, apply gamma, then scale back
                    const normalized = maxValue > 0 ? value / maxValue : 0;
                    const gammaCorrected = Math.pow(normalized, gamma);
                    return gammaCorrected * maxValue;
                })
            );
        }
    }, [array, debouncedScale, enableLogScale, scaleType]);

    const handleScaleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setScaleValue(Number(event.target.value));
    }, []);

    const handleScaleTypeChange = useCallback((newType: 'log' | 'gamma') => {
        setScaleType(newType);
        setScaleValue(0); // Reset slider to off
    }, []);

    const handleModeChange = useCallback((mode: 'zoom' | 'pan' | false) => {
        setInternalMode(mode);
        onDragModeChange?.(mode);
    }, [onDragModeChange]);

    // Hook to update dimensions of plot dynamically
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

    // Calculate the height based on the number of rows in the array
    const dynamicHeight = Math.max(array.length * verticalScaleFactor, 0); // Minimum height is 200px

    return (
        <>
            {enableLogScale && (
                <div className={cn("flex items-center justify-center gap-2 p-2 rounded-t-md mb-1", classNameControls)}>
                    <div className="flex items-center gap-2 ">
                        <button
                            onClick={() => handleScaleTypeChange('log')}
                            className={`px-2 py-1 text-xs font-medium  ${
                                scaleType === 'log' 
                                    ? 'text-sky-800 border-b border-b-sky-800 hover:cursor-default' 
                                    : 'text-slate-400 hover:text-sky-800'
                            }`}
                        >
                            Log Scale
                        </button>
                        <button
                            onClick={() => handleScaleTypeChange('gamma')}
                            className={`px-2 py-1 text-xs font-medium ${
                                scaleType === 'gamma' 
                                    ? 'text-sky-800 border-b border-b-sky-800 hover:cursor-default' 
                                    : 'text-slate-400 hover:text-sky-800'
                            }`}
                        >
                            Gamma Scale
                        </button>
                    </div>
                    <div className="flex items-center gap-3 justify-center ">
                        <span className="text-xs text-gray-600">Off</span>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={scaleValue}
                            onChange={handleScaleChange}
                            className="flex-1 max-w-24"
                            title={`${scaleType === 'log' ? 'Log' : 'Gamma'} Scale: ${scaleValue}`}
                        />
                        <span className="text-xs text-gray-600">Max</span>
                    </div>
                    <div className="text-xs text-gray-600 min-w-8">
                        {scaleValue === 0 ? '' : `(${scaleValue.toFixed(1)})`}
                    </div>
                </div>
            )}
            {modeBar === 'above' && (
                <div className="flex items-center gap-0.5 px-1 py-0.5 border-b border-slate-100">
                    {renderModeBar
                        ? renderModeBar({
                            dragMode,
                            onModeChange: handleModeChange,
                            onResetView: () => setZoomRanges({}),
                          })
                        : <>
                            <ButtonIconOnly
                                title="Cursor"
                                isSecondary
                                active={internalMode === false}
                                onClick={() => handleModeChange(false)}
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/></svg>}
                            />
                            <ButtonIconOnly
                                title="Zoom"
                                isSecondary
                                active={internalMode === 'zoom'}
                                onClick={() => handleModeChange('zoom')}
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/></svg>}
                            />
                            <ButtonIconOnly
                                title="Pan"
                                isSecondary
                                active={internalMode === 'pan'}
                                onClick={() => handleModeChange('pan')}
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>}
                            />
                            <ButtonIconOnly
                                title="Reset view"
                                isSecondary
                                onClick={() => setZoomRanges({})}
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/></svg>}
                            />
                          </>
                    }
                </div>
            )}
            <div className={cn(`h-full w-full rounded-b-md flex relative`, className)} ref={plotContainer}>
                <div className="flex-1 flex flex-col">
                    <Plot
                        data={[
                            {
                                z: processedArray,
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