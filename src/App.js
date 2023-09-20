import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
/*
Фичи:
- только горизонтальная виртуализация
- фиксированный размер элементов
- overscan
- isScrolling
*/

const items = Array.from({length: 10_000}, (_, index) => ({
    id: Math.random().toString(36).slice(2),
    text: String(index)
}))

const itemHeight = 40
const containerHeight = 600
const overscan = 3

export function Simple() {
    const [listItems, setListItems] = useState(items);
    const [scrollTop, setScrollTop] = useState(0)
    const scrollElementRef = useRef(null)
    useLayoutEffect(() => {
        const scrollElement = scrollElementRef.current;
        if (!scrollElement) {
            return;
        }
        const handleScroll = () => {
            const scrollTop = scrollElement.scrollTop;

            setScrollTop(scrollTop)
        }
        handleScroll();
        scrollElement.addEventListener("scroll", handleScroll)

        return () => scrollElement.removeEventListener("scroll", handleScroll)

    }, [])
    console.log(scrollTop)

    const range = useMemo(() => {
        const rangeStart = scrollTop;
        const rangeEnd = scrollTop + containerHeight

        let startIndex = Math.floor(rangeStart / itemHeight)
        let endIndex = Math.floor(rangeEnd / itemHeight)

        startIndex = Math.max(0, startIndex - overscan)
        endIndex = Math.min(listItems.length - 1, endIndex + overscan)
        return [startIndex, endIndex]
    }, [scrollTop, listItems.length])
    console.log(range)
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
                border: "1px solid gray"
            }}
            >
                {listItems.map((item) => {
                    return (
                        <div style={{height:itemHeight, padding: "6 12px"}} key={item.id}>
                            {item.text}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
