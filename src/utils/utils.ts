import {useEffect, useInsertionEffect, useMemo, useRef} from "react";


export function isNumber(value: unknown): value is number {
    return (typeof value === 'number');
}

export function useLatest<T>(value: T) {
    const theLatestValue = useRef(value);
    useInsertionEffect(() => {
        theLatestValue.current = value;
    }, []);

    return theLatestValue;
}

export function useResizeObserver(callback: ResizeObserverCallback) {
    const theLatestCallback = useLatest(callback);
    const resizeObserver = useMemo(() =>
            new ResizeObserver((entries, observer) => {
                theLatestCallback.current(entries, observer);
            }), []);

    //CleanUp fn:
    useEffect(() => {
        resizeObserver.disconnect();
    }, [])

    return resizeObserver;
}

export function requestAnimationFrameThrottle() {

}

export function scheduleDOMUpdate() {

}
