
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()
   
    const hostess = await prisma.hostess.findUnique({ where: { userId } });
    if (!hostess) {
      return new Response(JSON.stringify({error: true, message: "User not found" }), {});
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return new Response(JSON.stringify({error: true, message: "User not found" }), {});
    }
    
    return new Response(JSON.stringify({
      error: false,
      profile: {
        id: hostess.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        accepted_count: hostess.acceptedCount,
        completed_count: hostess.completedCount,
        total_count: hostess.totalCount,
      },
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Fetch data error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to get data. Please try again." }), {});
  }
}
