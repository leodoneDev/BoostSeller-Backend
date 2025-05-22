
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { receiveId } = await req.json();
    const paresedReceiveId = parseInt(receiveId);
    const notifications = await prisma.notification.findMany({
        where: {
            receiveId: paresedReceiveId,
        },
        orderBy: {
            createdAt: 'desc',
        }
    });

    
    return new Response(JSON.stringify({
      error: false,
      notifications,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to get notifications. Please try again." }), {});
  }
}
