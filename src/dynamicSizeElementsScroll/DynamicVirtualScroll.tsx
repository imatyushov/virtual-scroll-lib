//TODO 2:
// 1. размер контейнера +
// 2. разный размер элементов массива +
// 3. отслеживание элементов через resizeObserver +
// 4. корректировка скролла?


import {useCallback, useRef, useState} from "react";
import {useDynamicSizeList} from "./useDynamicSizeList";
import {faker} from "@faker-js/faker";

const mockItems = Array.from({length: 10_000}, (_, index) => ({
    id: Math.random().toString(36).slice(2),
    text: faker.lorem.paragraph({
        min: 3, max: 6
    })
}))
console.log('Mock items:', mockItems);

// const itemHeight = 40;
const containerHeight = 750;

const DynamicVirtualScroll = () => {
    const [listItems, setListItems] = useState(mockItems);
    const scrollElementRef = useRef<HTMLDivElement>(null);
    const {virtualItems, totalHeight, isScrolling, measureItem} = useDynamicSizeList({
        estimateItemHeight: useCallback(() => 16, []),
        getItemKey: useCallback((index) => listItems[index].id, [listItems]),
        itemsCount: listItems.length,
        getScrollElement: useCallback(() => scrollElementRef.current, [])
    })
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
                    border: '1px solid green',
                    position: 'relative'
                }}>
                <div style={{height: totalHeight}}>
                    {virtualItems.map((virtualItem) => {
                        const item = listItems[virtualItem.index]!
                        const dynamicItemHeight = virtualItem.height
                        return (
                            <div
                                ref={measureItem}
                                data-index={virtualItem.index}
                                style={{
                                    transform: `translateY(${virtualItem.offsetTop}px)`,
                                    padding: '6px 12px',
                                    position: 'absolute',
                                    top: 0,
                                    borderBottom: '1px solid teal',
                                    // height: dynamicItemHeight
                                }}
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

export default DynamicVirtualScroll;