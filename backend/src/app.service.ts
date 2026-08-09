import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return { name: 'MultiTree API', status: 'ok' as const };
  }
}
