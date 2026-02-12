export declare class MediaServer {
    private app;
    private httpServer;
    private io;
    private workerManager;
    private routerManager;
    private authService;
    private recordingService;
    private transportHandler;
    private producerHandler;
    private consumerHandler;
    constructor();
    init(): Promise<void>;
    private setupHttpRoutes;
    private setupSocketHandlers;
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map