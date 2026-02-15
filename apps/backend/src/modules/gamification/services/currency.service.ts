// apps/backend/src/modules/gamification/services/currency.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { TransactionType, Prisma } from '@prisma/client';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add currency to user account with transaction logging
   */
  async addCurrency(
    userId: string,
    amount: number,
    type: TransactionType,
    description?: string,
    tx?: Prisma.TransactionClient,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const prisma = tx || this.prisma;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const newBalance = user.currency + amount;

    // Update user currency
    await prisma.user.update({
      where: { id: userId },
      data: { currency: newBalance },
    });

    // Log transaction
    await prisma.currencyTransaction.create({
      data: {
        userId,
        amount,
        type,
        description,
        balanceBefore: user.currency,
        balanceAfter: newBalance,
        metadata: metadata || {},
      },
    });

    this.logger.log(
      `Added ${amount} currency to user ${userId}. New balance: ${newBalance}`,
    );
  }

  /**
   * Deduct currency from user account with transaction logging
   */
  async deductCurrency(
    userId: string,
    amount: number,
    type: TransactionType,
    description?: string,
    tx?: Prisma.TransactionClient,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const prisma = tx || this.prisma;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (user.currency < amount) {
      throw new Error('Insufficient currency');
    }

    const newBalance = user.currency - amount;

    // Update user currency
    await prisma.user.update({
      where: { id: userId },
      data: { currency: newBalance },
    });

    // Log transaction
    await prisma.currencyTransaction.create({
      data: {
        userId,
        amount: -amount,
        type,
        description,
        balanceBefore: user.currency,
        balanceAfter: newBalance,
        metadata: metadata || {},
      },
    });

    this.logger.log(
      `Deducted ${amount} currency from user ${userId}. New balance: ${newBalance}`,
    );
  }

  /**
   * Get user's current currency balance
   */
  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    return user.currency;
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string, limit: number = 50) {
    return this.prisma.currencyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
