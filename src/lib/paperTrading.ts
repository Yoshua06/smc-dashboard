// ─── Paper Trading Engine ─────────────────────────────────────────────────────
// All logic is pure (no React). UI components import from here.

export const PAPER_STORAGE_KEY = 'smc_paper_v1';
export const DEFAULT_BALANCE = 1000;

export type Direction = 'Long' | 'Short';
export type TradeResult = 'Win' | 'Loss' | 'BreakEven';

export interface PaperPosition {
    id: string;
    openedAt: string;      // formatted datetime string
    pair: string;
    direction: Direction;
    leverage: number;
    sizeUSDT: number;      // notional position size
    margin: number;        // sizeUSDT / leverage  (locked from balance)
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    rr: string;
    tags: string[];
    notes: string;
}

export interface PaperTrade {
    id: string;
    openedAt: string;
    closedAt: string;
    pair: string;
    direction: Direction;
    leverage: number;
    sizeUSDT: number;
    margin: number;
    entryPrice: number;
    closePrice: number;
    stopLoss: number;
    takeProfit: number;
    rr: string;
    tags: string[];
    notes: string;
    realizedPnL: number;
    result: TradeResult;
}

export interface PaperPortfolio {
    balance: number;           // free balance (not in open positions)
    openPositions: PaperPosition[];
    history: PaperTrade[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calcRR(entry: number, sl: number, tp: number): string {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk === 0) return '—';
    return `1:${(reward / risk).toFixed(2)}`;
}

/**
 * Calculates unrealized P&L for an open position given a current price.
 * P&L = (closePrice - entryPrice) × (sizeUSDT / entryPrice) for Long
 *      = (entryPrice - closePrice) × (sizeUSDT / entryPrice) for Short
 * (leverage is already baked into sizeUSDT)
 */
export function calcUnrealizedPnL(position: PaperPosition, currentPrice: number): number {
    const qty = position.sizeUSDT / position.entryPrice;
    if (position.direction === 'Long') {
        return (currentPrice - position.entryPrice) * qty;
    }
    return (position.entryPrice - currentPrice) * qty;
}

/**
 * Determines result from close price relative to entry / SL / TP
 */
function determineResult(
    direction: Direction,
    entryPrice: number,
    closePrice: number,
    stopLoss: number,
    takeProfit: number,
): TradeResult {
    const pnl = direction === 'Long'
        ? closePrice - entryPrice
        : entryPrice - closePrice;
    if (Math.abs(pnl) < 0.0001 * entryPrice) return 'BreakEven';
    return pnl > 0 ? 'Win' : 'Loss';
}

// ─── Portfolio actions ────────────────────────────────────────────────────────

export function openPosition(
    portfolio: PaperPortfolio,
    params: {
        pair: string;
        direction: Direction;
        leverage: number;
        sizeUSDT: number;   // notional (margin * leverage)
        entryPrice: number;
        stopLoss: number;
        takeProfit: number;
        tags: string[];
        notes: string;
        openedAt: string;
    }
): { portfolio: PaperPortfolio; error?: string } {
    const margin = params.sizeUSDT / params.leverage;
    if (margin > portfolio.balance) {
        return { portfolio, error: `Insufficient balance. Need $${margin.toFixed(2)} margin.` };
    }
    const position: PaperPosition = {
        id: Date.now().toString(),
        openedAt: params.openedAt,
        pair: params.pair,
        direction: params.direction,
        leverage: params.leverage,
        sizeUSDT: params.sizeUSDT,
        margin,
        entryPrice: params.entryPrice,
        stopLoss: params.stopLoss,
        takeProfit: params.takeProfit,
        rr: calcRR(params.entryPrice, params.stopLoss, params.takeProfit),
        tags: params.tags,
        notes: params.notes,
    };
    return {
        portfolio: {
            balance: portfolio.balance - margin,
            openPositions: [position, ...portfolio.openPositions],
            history: portfolio.history,
        },
    };
}

export function closePosition(
    portfolio: PaperPortfolio,
    positionId: string,
    closePrice: number,
    closedAt: string,
): PaperPortfolio {
    const pos = portfolio.openPositions.find(p => p.id === positionId);
    if (!pos) return portfolio;

    const qty = pos.sizeUSDT / pos.entryPrice;
    const realizedPnL = pos.direction === 'Long'
        ? (closePrice - pos.entryPrice) * qty
        : (pos.entryPrice - closePrice) * qty;

    const result = determineResult(pos.direction, pos.entryPrice, closePrice, pos.stopLoss, pos.takeProfit);

    const trade: PaperTrade = {
        id: pos.id,
        openedAt: pos.openedAt,
        closedAt,
        pair: pos.pair,
        direction: pos.direction,
        leverage: pos.leverage,
        sizeUSDT: pos.sizeUSDT,
        margin: pos.margin,
        entryPrice: pos.entryPrice,
        closePrice,
        stopLoss: pos.stopLoss,
        takeProfit: pos.takeProfit,
        rr: pos.rr,
        tags: pos.tags,
        notes: pos.notes,
        realizedPnL: parseFloat(realizedPnL.toFixed(4)),
        result,
    };

    // Return margin + realized PnL to balance
    const returnedCapital = pos.margin + realizedPnL;

    return {
        balance: portfolio.balance + returnedCapital,
        openPositions: portfolio.openPositions.filter(p => p.id !== positionId),
        history: [trade, ...portfolio.history],
    };
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

export function getPortfolio(): PaperPortfolio {
    if (typeof window === 'undefined') {
        return { balance: DEFAULT_BALANCE, openPositions: [], history: [] };
    }
    const raw = localStorage.getItem(PAPER_STORAGE_KEY);
    if (!raw) return { balance: DEFAULT_BALANCE, openPositions: [], history: [] };
    try {
        return JSON.parse(raw) as PaperPortfolio;
    } catch {
        return { balance: DEFAULT_BALANCE, openPositions: [], history: [] };
    }
}

export function savePortfolio(portfolio: PaperPortfolio): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PAPER_STORAGE_KEY, JSON.stringify(portfolio));
}

export function resetPortfolio(): PaperPortfolio {
    const fresh: PaperPortfolio = { balance: DEFAULT_BALANCE, openPositions: [], history: [] };
    savePortfolio(fresh);
    return fresh;
}
