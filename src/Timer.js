import React, {useEffect, useRef, useState} from 'react';
import Button from "./components/Button/Button";

const Timer = () => {
    const [seconds, setSeconds] = useState(0);
    const [isStarted, setIsStarted] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (isStarted) {
            setInterval(() => {
                setSeconds(prev => prev + 1)
            }, 1000)
        }
    }, [])

    return (
        <div ref={ref}>
            <h1>{seconds}</h1>
            <button onClick={() => setIsStarted(true)}>Старт</button>
            <button onClick={() => setIsStarted(false)}>Финиш</button>
        </div>
    );
};

export default Timer;