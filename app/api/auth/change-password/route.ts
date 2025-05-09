
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export async function POST(req: Request) {
  const { otpType, address, password } = await req.json();
  if(otpType == 1) {
    try {
      // Check for existing user
      const existingUser = await prisma.user.findUnique({ where: { email: address } });
      if (!existingUser) {
        return new Response(JSON.stringify({ error: true, message: 'User not found.' }), {
        });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.update({
        where: {email: address},
        data: {password: hashedPassword}
      });
  
      return new Response(JSON.stringify({ error: false,  message: 'Password Changed Successfully!'}), {
        status: 201,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: true, message: "Failed to changed password. \n Please try again. " }));
      
    }
  } else {
    //SMS
  }
  
}
