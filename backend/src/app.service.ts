import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return { name: 'Sponsor.krd API', status: 'ok' as const };
  }
}
