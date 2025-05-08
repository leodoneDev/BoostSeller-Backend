
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    const otpRecord = await prisma.otp.findFirst({
      where: {
        email,
        code,
        expiresAt: { gt: new Date() }, // not expired
      },
    });

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: true, message: 'Invalid or expired OTP.' }), {});
    }

    // Optional: delete OTP after successful use
    await prisma.otp.delete({ where: { id: otpRecord.id } });

    return new Response(JSON.stringify({ error: false, message: 'OTP verified!' }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: true, message: 'OTP verification failed. \n Please try again.' }), {});
  }
}

