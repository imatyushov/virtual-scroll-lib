import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
/*
Фичи:
- только горизонтальная виртуализация
- фиксированный размер элементов
- overscan
- isScrolling
*/

const items = Array.from({length: 10000}, (_, index) => ({
    id: Math.random().toString(36).slice(2),
    text: String(index)
}))

const itemHeight = 40;
const containerHeight = 600;
const overscan = 3;
const scrollingDelay = 100;

export function Scroll() {
    const [listItems, setListItems] = useState(items);
    const [scrollTop, setScrollTop] = useState(0);
    const scrollElementRef = useRef(null);
    const [isScrolling, setIsScrolling] = useState(false);

    useLayoutEffect(() => {
        const scrollElement = scrollElementRef.current;
        if (!scrollElement) {
            return;
        }
        const handleScroll = () => {
            const scrollTop = scrollElement.scrollTop;
            setScrollTop(scrollTop)
        }
        handleScroll()

        scrollElement.addEventListener('scroll', handleScroll)
        return () => scrollElement.removeEventListener('scroll', handleScroll)
    }, [])
    // console.log(scrollTop)

    useEffect(() => {
        const scrollElement = scrollElementRef.current;
        if (!scrollElement) {
            return;
        }

        let timeoutId = null // number || null
        const handleScroll = () => {
            setIsScrolling(true);

            clearTimeout(timeoutId) //TODO: разобраться с таймаутом и его очисткой

            timeoutId= setTimeout(() => {
                setIsScrolling(false)
            }, scrollingDelay)
        }
        scrollElement.addEventListener('scroll', handleScroll)
        return () => scrollElement.removeEventListener('scroll', handleScroll)
    }, [])

    const virtualItems = useMemo(() => {
        const rangeStart = scrollTop;
        const rangeEnd = scrollTop + containerHeight;
        let startIndex = Math.floor(rangeStart / itemHeight); // число элементов до viewport
        let endIndex = Math.ceil(rangeEnd / itemHeight); // число элементов до viewport и во viewport

        startIndex = Math.max(0, startIndex - overscan);
        endIndex = Math.min(listItems.length - 1, endIndex + overscan);
        console.log(startIndex, endIndex)

        const virtualItems = []

        for (let index = startIndex; index <= endIndex; index++) {
            virtualItems.push({
                index: index,
                offsetTop: index * itemHeight
            })
        }
        return virtualItems;
    }, [scrollTop, listItems.length])



    // const itemsToRender = listItems.slice(startIndex, endIndex + 1);
    const totalListHeight = itemHeight * listItems.length;

    return (
        <div style={{padding: "0 12px"}}>
            <h1>List</h1>
            <div style={{marginBottom: 12}}>
                <button onClick={() => setListItems((items) => items.slice().reverse())}>
                    reverse
                </button>
            </div>
                <div
                    ref={scrollElementRef}
                    style={{
                        height: containerHeight,
                        overflow: "auto",
                        border: "1px solid gray",
                        position: "relative"
                    }}
                >
                    <div style={{height: totalListHeight}}>
                        {virtualItems.map((virtualItem) => {
                            const item = listItems[virtualItem.index];
                            return (
                                <div style={{
                                    height:itemHeight,
                                    padding: "6 12px",
                                    position: "absolute",
                                    top: 0,
                                    transform: `translateY(${virtualItem.offsetTop}px)`
                                }}
                                     key={item.id}
                                >
                                    {item.text}
                                </div>
                            )
                        })}
                    </div>
                </div>
        </div>
    )
}
