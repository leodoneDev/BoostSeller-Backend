
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { code, otpType, address } = await req.json();

  if(otpType == 1) {
    try {
        const otpRecord = await prisma.otp.findFirst({
          where: {
            email: address,
            code,
            expiresAt: { gt: new Date() }, // not expired
          },
        });
    
        if (!otpRecord) {
          return new Response(JSON.stringify({ error: true, message: 'Invalid or expired OTP.',}), {});
        }
    
        // Optional: delete OTP after successful use
        await prisma.otp.delete({ where: { id: otpRecord.id } });
    
        return new Response(JSON.stringify({ error: false, message: 'OTP verified!', expire: false, }), { status: 200 });
      } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: true, message: 'OTP verification failed. Please try again.',}), {});
      }
  } else {

  }
  
}

