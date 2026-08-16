import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidTier } from "@/lib/wishlist";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tier = body.tier;

  if (tier !== undefined && tier !== null && !isValidTier(tier)) {
    return NextResponse.json({ error: "Invalid wishlist tier" }, { status: 400 });
  }

  const { count } = await prisma.player.updateMany({
    where: tier ? { wishlistTier: tier } : { wishlistTier: { not: null } },
    data: { wishlistTier: null },
  });

  return NextResponse.json({ count });
}
