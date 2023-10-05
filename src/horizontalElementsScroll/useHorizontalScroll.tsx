import {
    useCallback, useEffect,
    useInsertionEffect, useLayoutEffect,
    useMemo, useRef, useState
} from "react";

type Key = string | number;

interface useDynamicSizeGridProps {
    rowsCount: number;
    rowHeight?: (index: number) => number;
    estimateRowHeight?: (index: number) => number;
    getRowKey: (index: number) => Key;
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

const defaultOverscanY = 3;
const defaultScrollingDelay = 100;

function validateProps(props: useDynamicSizeGridProps) {
    const {rowHeight, estimateRowHeight} = props;
    if (!rowHeight && !estimateRowHeight) {
        throw new Error(
            `you must pass either rowHeight ${rowHeight} or estimateRowHeight ${estimateRowHeight} prop`
        )
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
       overscanY=defaultOverscanY,
       scrollingDelay=defaultScrollingDelay,
       getScrollElement
    } = props;

    const [scrollTop, setScrollTop] = useState(0);
    const [computedRowSizeCache, setComputedRowSizeCache] = useState<Record<Key, number>>({});
    const [viewportHeight, setViewportHeight] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);


    useLayoutEffect(() => {
        const scrollElement = getScrollElement();
        if (!scrollElement) {
            return;
        }
        const resizeObserver = new ResizeObserver(([entry]) => {
            if (!entry) {
                return;
            }

            const clientHeight = entry.contentBoxSize[0].blockSize ??
                entry.target.getBoundingClientRect().height;

            setViewportHeight(clientHeight);
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
            setScrollTop(scrollTop);
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
            if (typeof timeoutId === 'number') {
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


    const {virtualRows, startIndex, endIndex, totalHeight, allRows} =
        useMemo(() => {
            const getItemHeight = (index: number) => {
                if (rowHeight) {
                    return rowHeight(index);
                }

                const key = getRowKey(index);
                if (typeof computedRowSizeCache[key] === 'number') {
                    return computedRowSizeCache[key]!;
                }

                return estimateRowHeight!(index);
            }
            const rangeStart = scrollTop;
            const rangeEnd = scrollTop + viewportHeight;

            let startIndex = -1;
            let endIndex = -1;

            let totalHeight = 0;
            const allRows: dynamicSizeGridRow[] = Array(rowsCount);

            for (let index = 0; index < rowsCount; index++) {
                const key = getRowKey(index);
                const item = {
                    key,
                    index,
                    height: getItemHeight(index),
                    offsetTop: totalHeight
                }

                totalHeight += item.height;
                allRows[index] = item;

                if (startIndex === -1 && item.height + item.offsetTop > rangeStart) {
                    startIndex = Math.max(0, index - overscanY);
                }
                if (endIndex === -1 && item.height + item.offsetTop >= rangeEnd) {
                    endIndex = Math.min(rowsCount - 1, index + overscanY);
                }
            }
            const virtualRows = allRows.slice(startIndex, endIndex + 1);
            return {
                virtualRows,
                startIndex,
                endIndex,
                totalHeight,
                allRows
            }
        }, [scrollTop, viewportHeight, rowsCount, overscanY, rowHeight, estimateRowHeight, getRowKey, computedRowSizeCache]);


    const theLatestData = useLatest({computedRowSizeCache, getRowKey, getScrollElement, scrollTop});

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
    }, [])

    const itemsResizeObserver = useMemo(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            entries.forEach(entry => {
                const item = entry.target;

                computeRowHeight(item, resizeObserver, entry);
            })
        })
        return resizeObserver;
    }, [theLatestData]);

    const computeRow = useCallback((item: Element | null) => {
        computeRowHeight(item, itemsResizeObserver);
    }, [itemsResizeObserver])


    return {
        virtualRows,
        startIndex,
        endIndex,
        totalHeight,
        isScrolling,
        allRows,
        computeRow
    }
}