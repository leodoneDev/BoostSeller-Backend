// import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export async function POST(req: Request) {
  try {
    const { name, email, phoneNumber, password, role } = await req.json();

    // Check for existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return new Response(JSON.stringify({ error: true, message: 'User already exists.' }), {
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        role: role,
        isVerified: true,
        isApproved: false,
      },
    });

    

    return new Response(JSON.stringify({ error: false,  message: 'Register Successful!', user }), {
      status: 201,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: true, message: 'Failed to register. \n Please try again.' }));
  }
}
