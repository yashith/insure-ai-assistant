import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const start = Date.now();
        const now = new Date().toISOString();

        // Log when request starts
        console.log(`[${now}] ${req.method} ${req.originalUrl}`);

        res.on('finish', () => {
            const duration = Date.now() - start;
            console.log(
                `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
            );
        });

        next();
    }
}
