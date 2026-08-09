import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSignupApplicationDto } from './onboarding.dto';

describe('UpdateSignupApplicationDto', () => {
  it('accepts signup without social profiles, brand images, or color', async () => {
    const dto = plainToInstance(UpdateSignupApplicationDto, {
      ownerName: 'Ismail Dilshad',
      businessName: 'Multi Tree',
      phone: '7501234567',
      requestedSubdomain: 'multi-tree',
      acceptTerms: true,
      acceptPrivacy: true,
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });
});
