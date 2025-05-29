
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  try {
    const stages = await prisma.stage.findMany({
      orderBy: {
        sequence: 'asc',
      }
    });
    if(stages.length == 0) {
        return new Response(JSON.stringify({ error: true, message: "Not found Sales Stages." }), {
          
        });
    }
    return new Response(JSON.stringify({
      error: false,
      stages,
    }), {
      status: 200,
      
    });
   
  } catch (error) {
    console.error("fetching error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to fetch stages. Please try again." }), {
      
    });
  }
}
