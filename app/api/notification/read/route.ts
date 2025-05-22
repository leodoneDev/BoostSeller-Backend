
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    const parsedId = parseInt(id);
    const notification = await prisma.notification.update({
        where: {
            id: parsedId,
        },
        data : {
            isRead: true,
        },
    });

    
    return new Response(JSON.stringify({
      error: false,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to save read status. Please try again." }), {});
  }
}
