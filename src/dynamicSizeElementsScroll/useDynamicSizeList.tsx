import {useCallback, useEffect, useLayoutEffect, useMemo, useState} from "react";

type Key = string | number;

interface useDynamicSizeListProps {
    itemsCount: number;
    itemHeight?: (index: number) => number;
    estimateItemHeight?: (index: number) => number,
    getItemKey: (index: number) => Key,
    overscan?: number;
    scrollingDelay?: number;
    getScrollElement: () => HTMLElement | null;
}

const defaultOverscan = 3;
const defaultScrollingDelay = 200;

function validateProps(props: useDynamicSizeListProps) {
    const {itemHeight, estimateItemHeight} = props;
    if (!itemHeight && !estimateItemHeight) {
        throw new Error(
            `you must pass either itemHeight ${itemHeight} or estimateItemHeight ${estimateItemHeight} prop `
        )
    }
}

export function useDynamicSizeList(props: useDynamicSizeListProps) {
    validateProps(props);
    const {
        itemsCount,
        itemHeight,
        estimateItemHeight,
        getItemKey,
        overscan = defaultOverscan,
        scrollingDelay = defaultScrollingDelay,
        getScrollElement
} = props;

    const [cache, setCache] = useState<Record<Key, number>>({})
    const [viewportHeight, setViewportHeight] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
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
            setViewportHeight(clientHeight)
        })
        resizeObserver.observe(scrollElement);
        return () => {
            resizeObserver.unobserve(scrollElement);
        }
    }, [getScrollElement])

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
    }, [getScrollElement])

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
    }, [getScrollElement])


        const {virtualItems, startIndex, endIndex, totalHeight, allItems}
            = useMemo(() => {

            const getItemHeight = (index: number) => {
                if (itemHeight) {
                    return itemHeight(index);
                }
                const key = getItemKey(index);
                if (typeof cache[key] === 'number') {
                    return cache[key]!;
                }
                return estimateItemHeight!(index)
            }
            const rangeStart = scrollTop;
            const rangeEnd = scrollTop + viewportHeight;

            let startIndex = -1;
            let endIndex = -1;
            let totalHeight = 0;

            const allItems = Array(itemsCount);
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
                if (endIndex === -1 && item.height + item.offsetTop > rangeEnd) {
                    endIndex = Math.min(itemsCount - 1, index + overscan);
                }
            }
            const virtualItems = allItems.slice(startIndex, endIndex);
            return {
                virtualItems,
                startIndex,
                endIndex,
                totalHeight,
                allItems
            }
        }, [scrollTop, viewportHeight, itemsCount, overscan, itemHeight, cache, estimateItemHeight])

    const measureItem = useCallback((item: Element | null) => {
        if (!item) {
            return;
        }
        const indexAttribute = item.getAttribute('data-index') || '';
        const index = parseInt(indexAttribute, 10);
        if (Number.isNan(index)) {
            console.error(`dynamic items must have a valid index-attribute`)
            return;
        }
        const size = item.getBoundingClientRect();
        const key = getItemKey(index);

        setCache((cache) => ({...cache, [key]: size.height}))

    }, [getItemKey])

    return {
        virtualItems,
        startIndex,
        endIndex,
        totalHeight,
        isScrolling,
        allItems,
        measureItem
    }
}

