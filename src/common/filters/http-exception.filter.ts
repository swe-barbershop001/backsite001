import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ichki server xatosi';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message || message;
        error = responseObj.error || error;
      } else {
        message = exception.message || message;
      }
    } else if (exception instanceof Error) {
      // Database enum validation xatolarini handle qilish
      const errorMessage = exception.message || '';
      if (
        errorMessage.includes('invalid input value for enum') ||
        errorMessage.includes('enum') ||
        errorMessage.includes('constraint')
      ) {
        status = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        // Enum xatolarini to'g'ri formatlash
        if (errorMessage.includes('invalid input value for enum')) {
          const enumMatch = errorMessage.match(/enum (\w+): "([^"]+)"/);
          if (enumMatch) {
            message = `Noto'g'ri enum qiymati: "${enumMatch[2]}". To'g'ri qiymatlar: pending, approved, rejected, cancelled, completed`;
          } else {
            message = 'Noto\'g\'ri enum qiymati kiritildi';
          }
        } else {
          message = errorMessage;
        }
      } else {
        message = exception.message || message;
        this.logger.error(
          `Unexpected error: ${exception.message}`,
          exception.stack,
        );
      }
    } else {
      this.logger.error('Unknown error occurred', exception);
    }

    // Ignore known scanner/bot requests (404 only)
    const shouldIgnore =
      status === HttpStatus.NOT_FOUND &&
      (request.url.includes('+CSCO') ||
        request.url.includes('actuator') ||
        request.url.includes('security.txt') ||
        request.url.includes('SDK') ||
        request.url.includes('pdown') ||
        request.url === '/' ||
        request.url.includes('.jar') ||
        request.url.includes('.js'));

    // Log error (ignore scanner requests)
    if (!shouldIgnore) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
      );
    }

    // Response format
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: Array.isArray(message) ? message : [message],
      error: error,
    };

    response.status(status).json(errorResponse);
  }
}

