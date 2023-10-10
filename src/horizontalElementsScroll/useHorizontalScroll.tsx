import {
    useCallback, useEffect,
    useInsertionEffect, useLayoutEffect,
    useMemo, useRef, useState
} from "react";

import {isNumber, useResizeObserver} from "../utils/utils";

type Key = string | number;

interface useDynamicSizeGridProps {
    rowsCount: number;
    rowHeight?: (index: number) => number;
    estimateRowHeight?: (index: number) => number;
    getRowKey: (index: number) => Key;
    columnsCount: number;
    columnsWidth?: (index: number) => number;
    estimateColumnWidth?: (index: number) => number;
    getColumnKey: (index) => Key;
    overscanX?: number;
    overscanY?: number;
    scrollingDelay?: number;
    getScrollElement: () => HTMLElement | null;
}

interface dynamicSizeGridRow {
    key: Key,
    index: number;
    height: number;
    offsetTop: number;
}

interface dynamicSizeGridColumn {
    key: Key,
    index: number;
    width: number;
    offsetLeft: number;
}

const defaultOverscanX = 3;
const defaultOverscanY = 1;
const defaultScrollingDelay = 100;

function validateProps(props: useDynamicSizeGridProps) {
    const {rowHeight, estimateRowHeight, columnsWidth, estimateColumnWidth} = props;
    if (!rowHeight && !estimateRowHeight) {
        throw new Error(
            `you must pass either rowHeight ${rowHeight} or estimateRowHeight ${estimateRowHeight} prop`
        );
    }
    if (!columnsWidth && !estimateColumnWidth) {
        throw new Error(
            `you must pass either columnsWidth ${columnsWidth} or estimateColumnWidth ${estimateColumnWidth} prop`
        );
    }
    if (!rowHeight && !columnsWidth) {
        throw new Error(
            `you must pass either rowHeight ${rowHeight} or columnsWidth ${columnsWidth} prop`
        );
    }
}

function useLatest<T>(value: T) {
    const valueRef = useRef(value);
    useInsertionEffect(() => {
        valueRef.current = value;
    }, [])
    return valueRef;
}

export function useHorisontalScroll(props: useDynamicSizeGridProps) {
    validateProps(props);
    const {
       rowsCount,
       rowHeight,
       estimateRowHeight,
       getRowKey,
       columnsCount,
       columnsWidth,
       estimateColumnWidth,
       getColumnKey,
       overscanX=defaultOverscanX,
       overscanY=defaultOverscanY,
       scrollingDelay=defaultScrollingDelay,
       getScrollElement,
    } = props;

    const [scrollTop, setScrollTop] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const [computedRowSizeCache, setComputedRowSizeCache] = useState<Record<Key, number>>({});
    const [computedColumnSizeCache, setComputedColumnSizeCache] = useState<Record<string, number>>({});

    const [gridHeight, setGridHeight] = useState(0);
    const [gridWidth, setGridWidth] = useState(0);

    const [isScrolling, setIsScrolling] = useState(false);


    const computeColumnsWidths = useMemo(() => {
        if (columnsWidth) {
            return Array.from({ length: columnsCount }, (_, index) =>
                columnsWidth(index)
            )
        }

        const allColumnsWidths: number[] = Array(columnsCount);

        for (let columnIndex = 0; columnIndex < columnsCount; columnIndex++) {
            let computedMaxColumnWidths: number | undefined = undefined;

            for (let rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
                const key = `${getRowKey(rowIndex)}-${getColumnKey(columnIndex)}`;
                const columnSize = computedColumnSizeCache[key];

                if (isNumber(columnSize)) {
                    computedMaxColumnWidths = isNumber(computedMaxColumnWidths)
                    ? Math.max(columnSize, computedMaxColumnWidths)
                    : columnSize;
                }
            }

            if (isNumber(computedMaxColumnWidths)) {
                allColumnsWidths[columnIndex] = computedMaxColumnWidths;
            } else {
                allColumnsWidths[columnIndex] = estimateColumnWidth?.(columnIndex) ?? 0;
            }
        }
        return allColumnsWidths;

    }, [
        columnsCount,
        rowsCount,
        computedColumnSizeCache,
        getRowKey,
        getColumnKey,
        columnsWidth,
        estimateColumnWidth
    ])

    useLayoutEffect(() => {
            const scrollElement = getScrollElement();
            if (!scrollElement) {
                return;
            }
            const resizeObserver = new ResizeObserver(([entry]) => {
                if (!entry) {
                    return;
                }

                const clientGridSize = entry.contentBoxSize[0] ?
                    {height: entry.contentBoxSize[0].blockSize, width: entry.contentBoxSize[0].inlineSize} :
                    entry.target.getBoundingClientRect();

                setGridHeight(clientGridSize.height);
                setGridWidth(clientGridSize.width);
            })
            resizeObserver.observe(scrollElement);
            return () => {
                resizeObserver.unobserve(scrollElement);
            }
        }, [getScrollElement]);

    useLayoutEffect(() => {
            const scrollElement = getScrollElement();
            if (!scrollElement) {
                return;
            }
            const handleScroll = () => {
                const scrollTop = scrollElement.scrollTop;
                const scrollLeft = scrollElement.scrollLeft;

                setScrollTop(scrollTop);
                setScrollLeft(scrollLeft);
            }

            handleScroll();

            scrollElement.addEventListener('scroll', handleScroll);
            return () => {
                scrollElement.removeEventListener('scroll', handleScroll);
            }
        }, [getScrollElement]);

    useEffect(() => {
            const scrollElement = getScrollElement();
            if (!scrollElement) {
                return;
            }

            let timeoutId: number | null = null;

            const handleScroll = () => {
                setIsScrolling(true);
                if (isNumber(timeoutId)) {
                    clearTimeout(timeoutId);
                }
                timeoutId = window.setTimeout(() => {
                    setIsScrolling(false);
                }, scrollingDelay)
            }
            scrollElement.addEventListener('scroll', handleScroll);
            return () => {
                if (typeof timeoutId === 'number') {
                    clearTimeout(timeoutId);
                }
                scrollElement.removeEventListener('scroll', handleScroll);
            }
        }, [getScrollElement]);


    const {virtualRows, startRowIndex, endRowIndex, totalRowsHeight, allRows} =
        useMemo(() => {

                const getRowHeight = (index: number) => {
                    if (rowHeight) {
                        return rowHeight(index);
                    }

                    const key = getRowKey(index);
                    if (typeof computedRowSizeCache[key] === 'number') {
                        return computedRowSizeCache[key]!;
                    }

                    return estimateRowHeight!(index);
                }
                const rangeRowStart = scrollTop;
                const rangeRowEnd = scrollTop + gridHeight;

                let startRowIndex = 0;
                let endRowIndex = 0;

                let totalRowsHeight = 0;
                const allRows: dynamicSizeGridRow[] = Array(rowsCount);

                for (let index = 0; index < rowsCount; index++) {
                    const key = getRowKey(index);
                    const row: dynamicSizeGridRow = {
                        key,
                        index,
                        height: getRowHeight(index),
                        offsetTop: totalRowsHeight
                    }

                    totalRowsHeight += row.height;
                    allRows[index] = row;

                    if ((row.height + row.offsetTop) < rangeRowStart) {
                        startRowIndex++;
                    }
                    if ((row.height + row.offsetTop) < rangeRowEnd) {
                        endRowIndex++;
                    }
                }
                startRowIndex = Math.max(0, startRowIndex - overscanY);
                endRowIndex = Math.min(rowsCount - 1, endRowIndex + overscanY);

                const virtualRows = allRows.slice(startRowIndex, endRowIndex + 1);
                return {
                    virtualRows,
                    startRowIndex,
                    endRowIndex,
                    totalRowsHeight,
                    allRows
                }
            }, [scrollTop, gridHeight, rowsCount, overscanY, rowHeight, estimateRowHeight, getRowKey, computedRowSizeCache]);


    const {virtualColumns, startColumnIndex, endColumnIndex, totalColumnsWidth, allColumns} =
            useMemo(() => {

                const rangeColumnStart = scrollLeft;
                const rangeColumnEnd = scrollLeft + gridWidth;

                let startColumnIndex = 0;
                let endColumnIndex = 0;

                let totalColumnsWidth = 0;
                const allColumns: dynamicSizeGridColumn[] = Array(columnsCount);

                for (let index = 0; index < columnsCount; index++) {
                    const key = getColumnKey(index);
                    const column: dynamicSizeGridColumn = {
                        key,
                        index,
                        width: computeColumnsWidths[index]!,
                        offsetLeft: totalColumnsWidth
                    }

                    totalColumnsWidth += column.width;
                    allColumns[index] = column;

                    if ((column.width + column.offsetLeft) < rangeColumnStart) {
                        startColumnIndex++;
                    }
                    if ((column.width + column.offsetLeft) <= rangeColumnEnd) {
                        endColumnIndex++;
                    }
                }
                startColumnIndex = Math.max(0, startColumnIndex - overscanX);
                endColumnIndex = Math.min(columnsCount - 1, endColumnIndex + overscanX);

                const virtualColumns = allColumns.slice(startColumnIndex, endColumnIndex + 1);

                return {
                    virtualColumns,
                    startColumnIndex,
                    endColumnIndex,
                    totalColumnsWidth,
                    allColumns
                }
                }, [scrollLeft, gridWidth, columnsCount, overscanX, getColumnKey, computeColumnsWidths]);


    const theLatestData = useLatest({
            computedRowSizeCache,
            getRowKey,
            scrollTop,
            allRows,
            computedColumnSizeCache,
            allColumns,
            scrollLeft,
            getColumnKey,
            getScrollElement
        });

    const computeRowHeight = useCallback((
        item: Element | null,
        resizeObserver: ResizeObserver,
        entry?: ResizeObserverEntry
    ) => {

            if (!item) {
                return;
            }

            if (!item.isConnected) {
                resizeObserver.unobserve(item);
                return;
            }

            const dataIndex = item.getAttribute('data-row-index') || '';
            const index = parseInt(dataIndex, 10);
            if (Number.isNaN(index)) {
                console.error('virtual items must have a correct `data-index` attribute');
                return;
            }

            const {
                computedRowSizeCache,
                getRowKey,
                getScrollElement,
                scrollTop
            } = theLatestData.current;

            const key = getRowKey(index);
            const isResizeItem = Boolean(entry);

            resizeObserver.observe(item);

            if (!isResizeItem && typeof computedRowSizeCache[key] === 'number') {
                return;
            }

            if (!entry) {
                return;
            }
            const itemHeight = entry.contentBoxSize[0].blockSize ??
                item.getBoundingClientRect().height;

            if (computedRowSizeCache[key] === itemHeight) {
                return;
            }

            const element = allRows[index];
            const scrollUpGap = itemHeight - element.height;
            if (scrollUpGap !== 0 && scrollTop > element.offsetTop) {
                const scrollElement = getScrollElement();
                if (scrollElement) {
                    scrollElement.scrollBy(0, scrollUpGap);
                }
            }

            setComputedRowSizeCache((cache) => ({...cache, [key]: itemHeight}));
        }, [theLatestData])

    const itemsResizeObserver = useResizeObserver((entries, observer) => {
        entries.forEach((entry) => {
            const item = entry.target;
            computeRowHeight(item, observer, entry);
        })
    })

    const computeRow = useCallback((item: Element | null) => {
        computeRowHeight(item, itemsResizeObserver);
        }, [itemsResizeObserver]);



    const computeColumnWidth = useCallback((
            item: Element | null,
            resizeObserver: ResizeObserver,
            entry?: ResizeObserverEntry
        ) => {

        if (!item) {
            return;
        }

        if (!item.isConnected) {
            resizeObserver.unobserve(item);
            return;
        }

        const dataRowIndex = item.getAttribute('data-row-index') || '';
        const rowIndex = parseInt(dataRowIndex, 10);

        const dataColumnIndex = item.getAttribute('data-column-index') || '';
        const columnIndex = parseInt(dataColumnIndex, 10);

        if (Number.isNaN(rowIndex) || Number.isNaN(columnIndex)) {
            console.error('virtual items must have a correct `data-row-index` and `data-column-index` attribute');
            return;
        }

        const {getRowKey, getColumnKey,computedColumnSizeCache, allColumns, scrollLeft, getScrollElement  } = theLatestData.current;

        const key = `${getRowKey(rowIndex)}-${getColumnKey(columnIndex)}`;
        const isResize = Boolean(entry);
        resizeObserver.observe(item);

        if (!isResize && isNumber(computedColumnSizeCache[key])) {
            return;
        }

        if (!entry) {
            return;
        }
        const itemWidth = entry.contentBoxSize[0].inlineSize ??
            item.getBoundingClientRect().width;

        if (computedColumnSizeCache[key] === itemWidth) {
            return;
        }

        setComputedColumnSizeCache((cache) => ({...cache, [key]: itemWidth}));

        const element = allColumns[columnIndex]
        const scrollLeftGap = itemWidth - element.width;
        if (scrollLeftGap !== 0 && (scrollLeft - element.offsetLeft) < 0){
            const scrollElement = getScrollElement();
            if (scrollElement) {
                scrollElement.scrollBy(scrollLeftGap, 0);
            }
        }
    }, [theLatestData]);

    const columnWidthResizeObserver = useResizeObserver((entries, observer) => {
        entries.forEach((entry) => {
            const item = entry.target;
            computeColumnWidth(item, observer, entry);
        })
    })

    const computeColumn = useCallback((item: Element | null) => {
        computeColumnWidth(item, columnWidthResizeObserver);
    }, [columnWidthResizeObserver]);

    return {
        virtualRows,
        startRowIndex,
        endRowIndex,
        totalRowsHeight,
        isScrolling,
        allRows,
        computeRow,
        virtualColumns,
        startColumnIndex,
        endColumnIndex,
        totalColumnsWidth,
        allColumns,
        computeColumn
    }
}