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

    const {virtualElements, startIndex, endIndex, allElements, totalHeight}
        = useMemo(() => {
        const rangeStart = scrollTop;
        const rangeEnd = scrollTop + viewportHeight;

        let totalHeight = 0;
        let startIndex = -1;
        let endIndex = -1;

        const allElements = Array(itemsCount);

        for (let index = 0; index < itemsCount; index++) {
            const element = {
                index,
                height: itemHeight(index),
                offsetTop: totalHeight
            }
            totalHeight += element.height;
            allElements[index] = element;

            if (startIndex === -1 && element.height + element.offsetTop > rangeStart) {
                startIndex = Math.max(0, index - overscan);
            }
            if (endIndex === -1 && element.height + element.offsetTop > rangeEnd) {
                endIndex = Math.min(itemsCount - 1, index + overscan)
            }
        }
        const virtualElements = allElements.slice(startIndex, endIndex);
        return {
            virtualElements,
            startIndex,
            endIndex,
            allElements,
            totalHeight
        }
    }, [scrollTop, viewportHeight, itemsCount, overscan, itemHeight])

    return {
        virtualElements,
        startIndex,
        endIndex,
        totalHeight,
        isScrolling,
        allElements
    }
}

