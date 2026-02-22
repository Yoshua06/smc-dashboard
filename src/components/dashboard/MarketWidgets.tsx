'use client';

import React, { useEffect, useRef, memo } from 'react';

function MarketWidgets() {
    const calendarRef = useRef<HTMLDivElement>(null);
    const overviewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Inject Economic Calendar
        if (calendarRef.current && calendarRef.current.children.length === 0) {
            const scriptCal = document.createElement("script");
            scriptCal.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
            scriptCal.type = "text/javascript";
            scriptCal.async = true;
            scriptCal.innerHTML = `
        {
          "colorTheme": "dark",
          "isTransparent": true,
          "width": "100%",
          "height": "100%",
          "locale": "en",
          "importanceFilter": "0,1",
          "currencyFilter": "USD"
        }`;
            calendarRef.current.appendChild(scriptCal);
        }

        // Inject Heatmap / Overview
        if (overviewRef.current && overviewRef.current.children.length === 0) {
            const scriptOverview = document.createElement("script");
            scriptOverview.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
            scriptOverview.type = "text/javascript";
            scriptOverview.async = true;
            scriptOverview.innerHTML = `
        {
          "symbol": "BINANCE:BTCUSDT",
          "width": "100%",
          "height": "100%",
          "locale": "en",
          "dateRange": "1D",
          "colorTheme": "dark",
          "isTransparent": true,
          "autosize": true,
          "largeChartUrl": ""
        }`;
            overviewRef.current.appendChild(scriptOverview);
        }
    }, []);

    return (
        <div className="flex flex-col h-full gap-4 pb-2">

            {/* Mini Overview Widget */}
            <div className="h-[35%] w-full rounded-xl border border-white/5 bg-black/20 overflow-hidden relative">
                <div ref={overviewRef} className="tradingview-widget-container__widget w-full h-full"></div>
            </div>

            {/* Economic Calendar Widget */}
            <div className="flex-1 w-full rounded-xl border border-white/5 bg-black/20 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none flex justify-between">
                    <span className="text-xs font-semibold text-danger">⚠️ High Impact News Only</span>
                </div>
                <div className="pt-8 h-full">
                    <div ref={calendarRef} className="tradingview-widget-container__widget w-full h-full"></div>
                </div>
            </div>

        </div>
    );
}

export default memo(MarketWidgets);
