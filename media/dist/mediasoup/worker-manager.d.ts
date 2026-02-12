import type { Worker } from 'mediasoup/node/lib/WorkerTypes';
export declare class WorkerManager {
    private workers;
    private nextWorkerIdx;
    createWorkers(): Promise<void>;
    getNextWorker(): Worker;
    getWorkers(): Worker[];
    closeAll(): Promise<void>;
}
//# sourceMappingURL=worker-manager.d.ts.map