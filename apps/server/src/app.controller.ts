import { Controller, Get, NotFoundException, All } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Catch-all route handler for unmatched endpoints
   * Returns 404 Not Found for any route that doesn't match defined routes
   * This handler must be registered last to avoid intercepting valid routes
   */
  @All('*')
  handleNotFound(): never {
    throw new NotFoundException('The requested endpoint does not exist.');
  }
}
