'use client';

import React, { useEffect, useRef, memo } from 'react';

function TradingChart() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Prevent multiple scripts from appending in strict mode
        if (container.querySelector('script')) return;

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.type = 'text/javascript';
        script.async = true;
        script.textContent = JSON.stringify({
            autosize: true,
            symbol: 'BYBIT:BTCUSDT',
            interval: '15',
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            enable_publishing: false,
            backgroundColor: '#121212',
            gridColor: '#1e1e1e',
            hide_top_toolbar: false,
            hide_side_toolbar: false,
            hide_legend: false,
            save_image: false,
            container_id: 'tradingview_widget',
            support_host: 'https://www.tradingview.com',
        });

        container.appendChild(script);
    }, []);

    return (
        <div
            className="tradingview-widget-container w-full h-full"
            ref={containerRef}
        >
            <div
                id="tradingview_widget"
                className="tradingview-widget-container__widget w-full h-full"
            />
        </div>
    );
}

export default memo(TradingChart);
