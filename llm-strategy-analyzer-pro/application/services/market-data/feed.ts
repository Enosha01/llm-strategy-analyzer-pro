import WebSocket from 'ws';

interface MarketData {
    price: number;
    timestamp: number;
}

export class MarketDataFeed {
    private ws: WebSocket;
    private subscribers: ((data: MarketData) => void)[] = [];

    constructor(private symbol: string) {
        this.ws = new WebSocket(`wss://market-data.com/stream?symbol=${symbol}`);
        this.ws.on('message', data => this.handleMessage(data));
    }

    private handleMessage(data: WebSocket.Data) {
        const parsed = JSON.parse(data.toString());
        this.subscribers.forEach(cb => cb(parsed));
    }

    subscribe(callback: (data: MarketData) => void): void {
        this.subscribers.push(callback);
    }
}