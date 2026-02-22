'use client';

import React, { useEffect, useRef, memo } from 'react';

interface TradingChartProps {
    pair?: string;
    interval?: string;
}

function TradingChart({ pair = 'BTC/USDT', interval = '15' }: TradingChartProps = {}) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Clear existing chart before rendering a new one
        container.innerHTML = '<div id="tradingview_widget" class="tradingview-widget-container__widget w-full h-full"></div>';

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.type = 'text/javascript';
        script.async = true;

        let symbol = pair;
        // Map common crypto pairs to a default exchange if they contain a slash
        if (pair.includes('/')) {
            symbol = 'BYBIT:' + pair.replace('/', '');
        }

        script.textContent = JSON.stringify({
            autosize: true,
            symbol: symbol,
            interval: interval,
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
    }, [pair, interval]);

    return (
        <div
            className="tradingview-widget-container w-full h-full"
            ref={containerRef}
        >
        </div>
    );
}

export default memo(TradingChart);
