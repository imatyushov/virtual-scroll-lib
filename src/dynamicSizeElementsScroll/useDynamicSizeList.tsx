import {
    useCallback, useEffect,
    useInsertionEffect, useLayoutEffect,
    useMemo, useRef, useState
} from "react";

type Key = string | number;

interface useDynamicSizeListProps {
    itemsCount: number;
    itemHeight?: (index: number) => number;
    estimateItemHeight?: (index: number) => number;
    getItemKey: (index: number) => Key;
    overscan?: number;
    scrollingDelay?: number;
    getScrollElement: () => HTMLElement | null;
}

interface dynamicSizeListItem {
    key: Key,
    index: number;
    height: number;
    offsetTop: number;
}

const defaultOverscan = 3;
const defaultScrollingDelay = 100;

function validateProps(props: useDynamicSizeListProps) {
    const {itemHeight, estimateItemHeight} = props;
    if (!itemHeight && !estimateItemHeight) {
        throw new Error(
            `you must pass either itemHeight ${itemHeight} or estimateItemHeight ${estimateItemHeight} prop`
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

export function useDynamicSizeList(props: useDynamicSizeListProps) {
    validateProps(props);
    const {
        itemsCount,
        itemHeight,
        estimateItemHeight,
        getItemKey,
        overscan=defaultOverscan,
        scrollingDelay=defaultScrollingDelay,
        getScrollElement
    } = props;

    const [scrollTop, setScrollTop] = useState(0);
    const [computedItemsCache, setComputedItemsCache] = useState<Record<Key, number>>({});
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


    const {virtualItems, startIndex, endIndex, totalHeight, allItems} =
        useMemo(() => {
        const getItemHeight = (index: number) => {
            if (itemHeight) {
                return itemHeight(index);
            }

            const key = getItemKey(index);
            if (typeof computedItemsCache[key] === 'number') {
                return computedItemsCache[key]!;
            }

            return estimateItemHeight!(index);
        }
        const rangeStart = scrollTop;
        const rangeEnd = scrollTop + viewportHeight;

        let startIndex = -1;
        let endIndex = -1;

        let totalHeight = 0;
        const allItems: dynamicSizeListItem[] = Array(itemsCount);

        for (let index = 0; index < itemsCount; index++) {
            const key = getItemKey(index);
            const item = {
                key,
                index,
                height: getItemHeight(index),
                offsetTop: totalHeight
            }

            totalHeight += item.height;
            allItems[index] = item;

            if (startIndex === -1 && item.height + item.offsetTop > rangeStart) {
                startIndex = Math.max(0, index - overscan);
            }
            if (endIndex === -1 && item.height + item.offsetTop >= rangeEnd) {
                endIndex = Math.min(itemsCount - 1, index + overscan);
            }
        }
        const virtualItems = allItems.slice(startIndex, endIndex + 1);
        return {
            virtualItems,
            startIndex,
            endIndex,
            totalHeight,
            allItems
        }
    }, [scrollTop, viewportHeight, itemsCount, overscan, itemHeight, estimateItemHeight, getItemKey, computedItemsCache]);


    const theLatestData = useLatest({computedItemsCache, getItemKey, getScrollElement, scrollTop});

    const computeItemHeight = useCallback((
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

        const dataIndex = item.getAttribute('data-index') || '';
        const index = parseInt(dataIndex, 10);
        if (Number.isNaN(index)) {
            console.error('virtual items must have a correct `data-index` attribute');
            return;
        }

        const {
            computedItemsCache,
            getItemKey,
            getScrollElement,
            scrollTop
        } = theLatestData.current;

        const key = getItemKey(index);
        const isResizeItem = Boolean(entry);

        resizeObserver.observe(item);

        if (!isResizeItem && typeof computedItemsCache[key] === 'number') {
            return;
        }

        if (!entry) {
            return;
        }
        const itemHeight = entry.contentBoxSize[0].blockSize ??
            item.getBoundingClientRect().height;

        if (computedItemsCache[key] === itemHeight) {
            return;
        }

        const element = allItems[index];
        const scrollUpGap = itemHeight - element.height;
        if (scrollUpGap !== 0 && scrollTop > element.offsetTop) {
            const scrollElement = getScrollElement();
            if (scrollElement) {
                scrollElement.scrollBy(0, scrollUpGap);
            }
        }

        setComputedItemsCache((cache) => ({...cache, [key]: itemHeight}));
    }, [])

    const itemsResizeObserver = useMemo(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            entries.forEach(entry => {
                const item = entry.target;

                computeItemHeight(item, resizeObserver, entry);
            })
        })
        return resizeObserver;
    }, [theLatestData]);

    const computeItem = useCallback((item: Element | null) => {
        computeItemHeight(item, itemsResizeObserver);
    }, [itemsResizeObserver])


    return {
        virtualItems,
        startIndex,
        endIndex,
        totalHeight,
        isScrolling,
        allItems,
        computeItem
    }
}


