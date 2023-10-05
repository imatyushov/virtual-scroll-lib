//TODO 4:
// 1. Горизонтальная виртуализация
// 2. Улучшения


import {useCallback, useRef, useState} from "react";
import {faker} from "@faker-js/faker";
import {useHorisontalScroll} from "./useHorizontalScroll";

const gridSize = 100;

const createMockItems = () =>
    Array.from({ length: gridSize }, (_) => ({
        id: Math.random().toString(36).slice(2),
        columns: Array.from({ length: gridSize }, () => ({
            id: Math.random().toString(36).slice(2),
            text: faker.lorem.words({ min: 1, max: 7 }),
        })),
    }));


const containerHeight = 600;


const TestHorizontalScroll = () => {
    const [gridItems, setGridItems] = useState(createMockItems);
    const scrollElementRef = useRef<HTMLDivElement>(null);

    const {isScrolling, virtualRows, totalHeight, computeRow} = useHorisontalScroll({
        estimateRowHeight: useCallback(() => 20, []),
        getRowKey: useCallback((index) => gridItems[index]!.id, [gridItems]),
        rowsCount: gridSize,
        getScrollElement: useCallback(() => scrollElementRef.current, [])
    })

    const reverseGrid = () => {
        setGridItems((items) =>
            items
                .map((item) => ({
                    ...item,
                    columns: item.columns.slice().reverse(),
                }))
                .reverse()
        );
    };

    return (
        <div style={{padding: '0 12'}}>
            <h1>Virtual List</h1>
            <span>
                {isScrolling ? <div>IsScrolling</div> : <div>NotIsScrolling</div>}
            </span>
            <div style={{marginBottom: 12}}>
                <button onClick={reverseGrid}>
                    reverse
                </button>
            </div>
            <div
                ref={scrollElementRef}
                style={{
                    height: containerHeight,
                    overflow: "auto",
                    border: '2px solid green',
                    position: 'relative'
                }}>
                <div style={{height: totalHeight}}>
                    {virtualRows.map((virtualRow) => {
                        const item = gridItems[virtualRow.index]!;
                        return (
                            <div
                                ref={computeRow}
                                data-row-index={virtualRow.index}
                                key={item.id}
                                style={{
                                    transform: `translateY(${virtualRow.offsetTop}px)`,
                                    padding: '6px 12px',
                                    position: 'absolute',
                                    top: 0,
                                    display: 'flex'
                                }}
                            >
                                {virtualRow.index}
                                {item.columns.map(column => (
                                    <div
                                        key={column.id}
                                        style={{
                                            width: 200
                                        }}>
                                        {column.text}
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default TestHorizontalScroll;