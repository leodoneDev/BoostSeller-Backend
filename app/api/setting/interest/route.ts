
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


export async function GET() {
  try {
    const interests = await prisma.interest.findMany();
    if(interests.length == 0) {
        return new Response(JSON.stringify({ error: true, message: "Not found Interests." }), {
          
        });
    }
    return new Response(JSON.stringify({
      error: false,
      interests,
    }), {
      status: 200,
      
    });
   
  } catch (error) {
    console.error("fetching error:", error);
    return new Response(JSON.stringify({error: true, message: "Failed to fetch interests. \n Please try again." }), {
      
    });
  }
}
