import { z } from "zod";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { users, payments, gameProgress, ownedItems } from "../drizzle/schema";

// PayPal configuration - in production, use environment variables
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_API_URL = process.env.PAYPAL_MODE === "live" 
  ? "https://api-m.paypal.com" 
  : "https://api-m.sandbox.paypal.com";

const PREMIUM_PRICE = "10.00";
const PREMIUM_CURRENCY = "USD";

// Helper function to get PayPal access token
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  
  const data = await response.json();
  return data.access_token;
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Premium / PayPal routes
  premium: router({
    // Check if user is premium
    status: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { isPremium: false };
      
      const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      return {
        isPremium: user[0]?.isPremium ?? false,
        premiumSince: user[0]?.premiumSince ?? null,
      };
    }),

    // Create PayPal order for premium purchase
    createOrder: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if already premium
      const existingUser = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (existingUser[0]?.isPremium) {
        throw new Error("User is already premium");
      }

      try {
        const accessToken = await getPayPalAccessToken();
        
        const orderResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{
              amount: {
                currency_code: PREMIUM_CURRENCY,
                value: PREMIUM_PRICE,
              },
              description: "KannaSprout Premium - Lifetime Access",
            }],
          }),
        });

        const orderData = await orderResponse.json();
        
        // Save pending payment
        await db.insert(payments).values({
          userId: ctx.user.id,
          paypalOrderId: orderData.id,
          amount: PREMIUM_PRICE,
          currency: PREMIUM_CURRENCY,
          status: "pending",
          productType: "premium",
        });

        return {
          orderId: orderData.id,
          approvalUrl: orderData.links?.find((l: any) => l.rel === "approve")?.href,
        };
      } catch (error) {
        console.error("PayPal order creation failed:", error);
        throw new Error("Failed to create PayPal order");
      }
    }),

    // Capture PayPal payment and activate premium
    captureOrder: protectedProcedure
      .input(z.object({ orderId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        try {
          const accessToken = await getPayPalAccessToken();
          
          const captureResponse = await fetch(
            `${PAYPAL_API_URL}/v2/checkout/orders/${input.orderId}/capture`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          const captureData = await captureResponse.json();
          
          if (captureData.status === "COMPLETED") {
            // Update payment record
            await db.update(payments)
              .set({ 
                status: "completed",
                paypalPayerId: captureData.payer?.payer_id,
                completedAt: new Date(),
              })
              .where(eq(payments.paypalOrderId, input.orderId));

            // Activate premium for user
            await db.update(users)
              .set({ 
                isPremium: true,
                premiumSince: new Date(),
              })
              .where(eq(users.id, ctx.user.id));

            return { success: true, isPremium: true };
          } else {
            // Update payment as failed
            await db.update(payments)
              .set({ status: "failed" })
              .where(eq(payments.paypalOrderId, input.orderId));

            throw new Error("Payment was not completed");
          }
        } catch (error) {
          console.error("PayPal capture failed:", error);
          throw new Error("Failed to capture payment");
        }
      }),

    // Verify payment (for restoring purchases)
    verifyPurchase: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { isPremium: false };

      const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      
      if (user[0]?.isPremium) {
        return { isPremium: true, premiumSince: user[0].premiumSince };
      }

      // Check for completed payments
      const completedPayment = await db.select()
        .from(payments)
        .where(eq(payments.userId, ctx.user.id))
        .limit(1);

      if (completedPayment[0]?.status === "completed") {
        // Restore premium status
        await db.update(users)
          .set({ 
            isPremium: true,
            premiumSince: completedPayment[0].completedAt,
          })
          .where(eq(users.id, ctx.user.id));

        return { isPremium: true, premiumSince: completedPayment[0].completedAt };
      }

      return { isPremium: false };
    }),
  }),

  // Game progress routes
  game: router({
    // Get user's game progress
    getProgress: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const progress = await db.select()
        .from(gameProgress)
        .where(eq(gameProgress.userId, ctx.user.id))
        .limit(1);

      return progress[0] ?? null;
    }),

    // Update game progress
    updateProgress: protectedProcedure
      .input(z.object({
        currentLevel: z.number().optional(),
        highScore: z.number().optional(),
        totalScore: z.number().optional(),
        gleafBalance: z.number().optional(),
        gamesPlayed: z.number().optional(),
        pestsKilled: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existing = await db.select()
          .from(gameProgress)
          .where(eq(gameProgress.userId, ctx.user.id))
          .limit(1);

        if (existing.length === 0) {
          // Create new progress record
          await db.insert(gameProgress).values({
            userId: ctx.user.id,
            ...input,
          });
        } else {
          // Update existing record
          await db.update(gameProgress)
            .set(input)
            .where(eq(gameProgress.userId, ctx.user.id));
        }

        return { success: true };
      }),
  }),

  // Shop routes
  shop: router({
    // Get owned items
    getOwnedItems: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return db.select()
        .from(ownedItems)
        .where(eq(ownedItems.userId, ctx.user.id));
    }),

    // Purchase item with GLeaf
    purchaseItem: protectedProcedure
      .input(z.object({
        itemId: z.string(),
        itemType: z.enum(["seed", "boost", "cosmetic"]),
        price: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check GLeaf balance
        const progress = await db.select()
          .from(gameProgress)
          .where(eq(gameProgress.userId, ctx.user.id))
          .limit(1);

        const currentBalance = progress[0]?.gleafBalance ?? 0;
        
        if (currentBalance < input.price) {
          throw new Error("Insufficient GLeaf balance");
        }

        // Check if already owned
        const existing = await db.select()
          .from(ownedItems)
          .where(eq(ownedItems.userId, ctx.user.id))
          .limit(1);

        const alreadyOwned = existing.some(item => item.itemId === input.itemId);
        if (alreadyOwned) {
          throw new Error("Item already owned");
        }

        // Deduct GLeaf and add item
        await db.update(gameProgress)
          .set({ gleafBalance: currentBalance - input.price })
          .where(eq(gameProgress.userId, ctx.user.id));

        await db.insert(ownedItems).values({
          userId: ctx.user.id,
          itemId: input.itemId,
          itemType: input.itemType,
        });

        return { success: true, newBalance: currentBalance - input.price };
      }),
  }),
});

export type AppRouter = typeof appRouter;
