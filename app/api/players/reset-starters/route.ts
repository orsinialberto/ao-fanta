import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const { count } = await prisma.player.updateMany({
    where: { starter: true },
    data: { starter: false },
  });

  return NextResponse.json({ count });
}
