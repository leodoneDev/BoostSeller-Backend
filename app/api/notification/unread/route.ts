
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { receiveId } = await req.json();
    const paresedReceiveId = parseInt(receiveId);
    const unReadCount = await prisma.notification.count({
        where: {
            receiveId: paresedReceiveId,
            isRead: false,
        }
    });

    
    return new Response(JSON.stringify({
      error: false,
      unReadCount: unReadCount,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to get notifications. Please try again." }), {});
  }
}
