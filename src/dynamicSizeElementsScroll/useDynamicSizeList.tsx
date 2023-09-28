import {useEffect, useLayoutEffect, useMemo, useState} from "react";

interface useDynamicSizeListProps {
    itemsCount: number;
    itemHeight: number;
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

    const {virtualItems, startIndex, endIndex} = useMemo(() => {
        const rangeStart = scrollTop;
        const rangeEnd = scrollTop + viewportHeight;

        let startIndex = Math.floor(rangeStart / itemHeight);
        let endIndex = Math.ceil(rangeEnd / itemHeight);

        startIndex = Math.max(0, startIndex - overscan);
        endIndex = Math.min(itemsCount - 1,endIndex + overscan);
        const virtualItems = [];
        for (let index = startIndex; index <= endIndex; index++) {
            virtualItems.push({
                index: index,
                offsetTop: index * itemHeight
            })
        }
        return {virtualItems, startIndex, endIndex};
    }, [scrollTop, viewportHeight, itemsCount])

    const totalHeight = itemHeight * itemsCount;

    return {
        virtualItems,
        startIndex,
        endIndex,
        totalHeight,
        isScrolling,
    }
}

