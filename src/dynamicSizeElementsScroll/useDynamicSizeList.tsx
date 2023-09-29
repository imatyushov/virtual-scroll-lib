import {useEffect, useLayoutEffect, useMemo, useState} from "react";

interface useDynamicSizeListProps {
    itemsCount: number;
    itemHeight: (index: number) => number;
    overscan?: number;
    scrollingDelay?: number;
    getScrollElement: () => HTMLElement | null;
}

const defaultOverscan = 3;
const defaultScrollingDelay = 200;

export function useDynamicSizeList(props: useDynamicSizeListProps) {
    const {
        itemsCount,
        itemHeight,
        overscan = defaultOverscan,
        scrollingDelay = defaultScrollingDelay,
        getScrollElement
    } = props;

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
        let timeoutId: NodeJS.Timeout = null;
        const handleScroll = () => {
            setIsScrolling(true);

            if (typeof timeoutId === 'number') {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
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

    const {virtualItems, startIndex, endIndex, allItems, totalHeight} =
        useMemo(() => {
        const rangeStart = scrollTop;
        const rangeEnd = scrollTop + viewportHeight;

        let startIndex = -1;
        let endIndex = -1;

        let totalHeight = 0;
        const allItems = Array(itemsCount);

        for (let index = 0; index < itemsCount; index++) {
            const item = {
                index,
                height: itemHeight(index),
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
            itemsCount,
            totalHeight,
            allItems
        }
    }, [scrollTop, viewportHeight, overscan, itemHeight, itemsCount])

    return {
        virtualItems,
        startIndex,
        endIndex,
        totalHeight,
        isScrolling,
        allItems
    }
}

