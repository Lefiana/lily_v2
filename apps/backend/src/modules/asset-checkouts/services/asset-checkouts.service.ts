// apps/backend/src/modules/asset-checkouts/services/asset-checkouts.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { AssetCheckoutsRepository } from '../repositories/asset-checkouts.repository';
import { AssetCheckoutsGateway } from '../gateways/asset-checkouts.gateway';
import { AssetsService, AssetEvents } from '@modules/assets';
import {
  CreateCheckoutDto,
  ProcessReturnDto,
  CheckoutFiltersDto,
} from '../domain/checkout.dto';
import {
  CheckoutEvents,
  CheckoutStatus,
  IAssetCheckout,
} from '../domain/checkout.types';

@Injectable()
export class AssetCheckoutsService {
  private readonly logger = new Logger(AssetCheckoutsService.name);

  constructor(
    private readonly repo: AssetCheckoutsRepository,
    @Inject(forwardRef(() => AssetsService))
    private readonly assetsService: AssetsService,
    private readonly gateway: AssetCheckoutsGateway,
  ) {}

  private handleError(error: unknown, context: string): never {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${message}`);
    throw new InternalServerErrorException(context);
  }

  async createCheckout(dto: CreateCheckoutDto, userId: string) {
    try {
      // Validate all assets are available
      for (const item of dto.items) {
        const available = await this.assetsService.checkAvailability(
          item.assetId,
          item.quantity,
          userId,
        );
        if (!available) {
          const asset = await this.assetsService.findOne(item.assetId, userId);
          throw new BadRequestException(
            `${asset?.name || 'Asset'} is not available for checkout`,
          );
        }
      }

      // Reserve assets (decrement availability)
      await this.assetsService.reserveAssets(dto.items, userId);

      // Create checkout record
      const checkout = await this.repo.create({
        ...dto,
        userId,
        checkedOutBy: userId,
        status: 'BORROWED' as CheckoutStatus,
      });

      this.gateway.emitToUser(
        userId,
        CheckoutEvents.CHECKOUT_CREATED,
        checkout,
      );

      // Also emit asset availability changes
      for (const item of dto.items) {
        const asset = await this.assetsService.findOne(item.assetId, userId);
        this.gateway.emitToUser(
          userId,
          AssetEvents.ASSET_AVAILABILITY_CHANGED,
          {
            assetId: item.assetId,
            available: asset?.available,
            total: asset?.quantity,
          },
        );
      }

      return checkout;
    } catch (error) {
      this.handleError(error, 'Error creating checkout');
    }
  }

  async processReturn(
    checkoutId: string,
    dto: ProcessReturnDto,
    userId: string,
  ) {
    try {
      const checkout = await this.repo.findById(checkoutId, userId);
      if (!checkout) throw new NotFoundException('Checkout not found');

      if (checkout.status === ('RETURNED' as CheckoutStatus)) {
        throw new BadRequestException(
          'This checkout has already been returned',
        );
      }

      // Update checkout status
      const updated = await this.repo.update(checkoutId, {
        status: dto.damageFlag
          ? ('DAMAGED' as CheckoutStatus)
          : ('RETURNED' as CheckoutStatus),
        returnedAt: new Date(),
        returnCondition: dto.condition,
        damageFlag: dto.damageFlag,
        damageNotes: dto.damageNotes,
        checkedInBy: userId,
      });

      // Release assets back to inventory
      const items = checkout.items.map((item) => ({
        assetId: item.assetId,
        quantity: item.quantity,
      }));
      await this.assetsService.releaseAssets(items, userId);

      this.gateway.emitToUser(
        userId,
        CheckoutEvents.CHECKOUT_RETURNED,
        updated,
      );

      return updated;
    } catch (error) {
      this.handleError(error, 'Error processing return');
    }
  }

  async findAll(userId: string, filters?: CheckoutFiltersDto) {
    try {
      const checkouts = await this.repo.findAll(userId, filters);

      // Compute derived status for each checkout
      return checkouts.map((checkout) => ({
        ...checkout,
        computedStatus: this.computeCheckoutStatus(
          checkout as unknown as IAssetCheckout,
        ),
        isOverdue: this.isOverdue(checkout as unknown as IAssetCheckout),
        daysOverdue: this.calculateDaysOverdue(
          checkout as unknown as IAssetCheckout,
        ),
      }));
    } catch (error) {
      this.handleError(error, 'Error fetching checkouts');
    }
  }

  async findActive(userId: string, borrowerId?: string) {
    try {
      const checkouts = await this.repo.findActive(userId, borrowerId);
      return checkouts.map((checkout) => ({
        ...checkout,
        computedStatus: this.computeCheckoutStatus(
          checkout as unknown as IAssetCheckout,
        ),
        isOverdue: this.isOverdue(checkout as unknown as IAssetCheckout),
        daysOverdue: this.calculateDaysOverdue(
          checkout as unknown as IAssetCheckout,
        ),
      }));
    } catch (error) {
      this.handleError(error, 'Error fetching active checkouts');
    }
  }

  async findOverdue(userId: string) {
    try {
      const checkouts = await this.repo.findOverdue(userId);
      return checkouts.map((checkout) => ({
        ...checkout,
        computedStatus: CheckoutStatus.OVERDUE,
        isOverdue: true,
        daysOverdue: this.calculateDaysOverdue(
          checkout as unknown as IAssetCheckout,
        ),
      }));
    } catch (error) {
      this.handleError(error, 'Error fetching overdue checkouts');
    }
  }

  async findById(id: string, userId: string) {
    try {
      const checkout = await this.repo.findById(id, userId);
      if (!checkout)
        throw new NotFoundException(`Checkout with ID ${id} not found`);

      return {
        ...checkout,
        computedStatus: this.computeCheckoutStatus(
          checkout as unknown as IAssetCheckout,
        ),
        isOverdue: this.isOverdue(checkout as unknown as IAssetCheckout),
        daysOverdue: this.calculateDaysOverdue(
          checkout as unknown as IAssetCheckout,
        ),
      };
    } catch (error) {
      this.handleError(error, 'Error retrieving checkout');
    }
  }

  async cancelCheckout(id: string, userId: string) {
    try {
      const checkout = await this.findById(id, userId);

      if (checkout.status !== ('BORROWED' as CheckoutStatus)) {
        throw new BadRequestException('Only active checkouts can be cancelled');
      }

      // Release assets back to inventory
      const items = checkout.items.map((item) => ({
        assetId: item.assetId,
        quantity: item.quantity,
      }));
      await this.assetsService.releaseAssets(items, userId);

      await this.repo.delete(id);

      this.gateway.emitToUser(userId, CheckoutEvents.CHECKOUT_CANCELLED, {
        id,
      });

      return { success: true };
    } catch (error) {
      this.handleError(error, 'Error cancelling checkout');
    }
  }

  private computeCheckoutStatus(checkout: IAssetCheckout): CheckoutStatus {
    if (
      checkout.status === ('RETURNED' as CheckoutStatus) ||
      checkout.status === ('DAMAGED' as CheckoutStatus)
    ) {
      return checkout.status;
    }

    if (checkout.returnedAt) {
      return checkout.damageFlag
        ? ('DAMAGED' as CheckoutStatus)
        : ('RETURNED' as CheckoutStatus);
    }

    if (this.isOverdue(checkout)) {
      return 'OVERDUE' as CheckoutStatus;
    }

    return 'BORROWED' as CheckoutStatus;
  }

  private isOverdue(checkout: IAssetCheckout): boolean {
    if (
      checkout.returnedAt ||
      checkout.status === ('RETURNED' as CheckoutStatus)
    ) {
      return false;
    }
    return new Date() > new Date(checkout.dueDate);
  }

  private calculateDaysOverdue(checkout: IAssetCheckout): number {
    if (checkout.returnedAt) return 0;

    const now = new Date();
    const due = new Date(checkout.dueDate);
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }
}
