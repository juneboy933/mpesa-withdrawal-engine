import { Body, Controller, Post } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { MpesaService } from './mpesa.service';
import type { MpesaCallbackPayload } from './dto/mpesa-callback.dto';

@Controller('mpesa')
export class MpesaController {
  constructor(private readonly mpesa: MpesaService) {}

  @Public()
  @Post('callback')
  handleCallback(@Body() payload: MpesaCallbackPayload) {
    return this.mpesa.handleCallback(payload);
  }
}
