import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';

//TODO:
// 1.только вертикальная виртуализация
// 2. фиксированный размер элементов
// 3. overscan
// 4. flag isScrolling


const items = Array.from({length: 10_000}, (_,index) => ({
    id: Math.random().toString(36).slice(2),
    text: String(index)
}))

const itemHeight = 40;
const containerHeight = 600;
const overscan = 3;
const scrollingDelay = 100;


const VirtualScroll = () => {
    const [listItems, setListItems] = useState(items);
    const [scrollTop, setScrollTop] = useState(0);
    const scrollElementRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);

    console.log('scrollElementRef.current:',scrollElementRef.current)
    useLayoutEffect(() => {
        const scrollElement = scrollElementRef.current;
        if (!scrollElement) {
            return
        }
       const handleScroll = () => {
            const scrollTop = scrollElement.scrollTop
           setScrollTop(scrollTop)
       }
        handleScroll();
        scrollElement.addEventListener('scroll', handleScroll);
        return() => {
            scrollElement.removeEventListener('scroll', handleScroll);
        }
    }, [])
    console.log('scrollTop:',scrollTop)

    useEffect(() => {
        const scrollElement = scrollElementRef.current;
        if (!scrollElement) {
            return;
        }
        let timeoutId: NodeJS.Timeout = null;
        const handleScroll = () => {
            setIsScrolling(true);
            if (typeof timeoutId === 'number'){
                clearTimeout(timeoutId)
            }
            timeoutId = setTimeout(() => {
                setIsScrolling(false);
            }, scrollingDelay);
        }
        scrollElement.addEventListener('scroll', handleScroll);
        return () => {
            if (typeof timeoutId === 'number'){
                clearTimeout(timeoutId)
            }
            scrollElement.removeEventListener('scroll', handleScroll);
        }
    }, [])

    console.log('Scrolling:', isScrolling)

    const virtualItems = useMemo(() => {
        const rangeStart = scrollTop;
        const rangeEnd = scrollTop + containerHeight;
        let startIndex = Math.floor(rangeStart / itemHeight);
        let endIndex = Math.ceil(rangeEnd / itemHeight);
        startIndex = Math.max(0, startIndex - overscan);
        endIndex = Math.min(listItems.length - 1, endIndex + overscan)

        const virtualItems = [];
        for (let index = startIndex; index <= endIndex; index++) {
            virtualItems.push({
                index,
                offsetTop: index * itemHeight
            })
        }
        return virtualItems
    }, [scrollTop, listItems.length])

    // console.log('range:',range)
    // const itemsToRender = listItems.slice(startIndex, endIndex + 1);
    const totalListHeight = itemHeight * listItems.length;
    return (
        <div style={{padding: '0 12'}}>
            <h1>List</h1>
            <span>
                {isScrolling ? <div>IsScrolling</div> : <div>NotIsScrolling</div>}
            </span>
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
                    border: '1px solid lightgrey',
                    position: 'relative'
            }}>
                <div style={{height: totalListHeight}}>
                    {virtualItems.map((virtualItem) => {
                        const item = listItems[virtualItem.index]!
                        return (
                            <div
                                style={{
                                    height: itemHeight,
                                    transform: `translateY(${virtualItem.offsetTop}px)`,
                                    padding: '6px 12px',
                                    position: 'absolute',
                                    top: 0,
                                }}
                                key={item.id}
                            >
                                {isScrolling? 'Scrolling...' : item.text}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default VirtualScroll;
