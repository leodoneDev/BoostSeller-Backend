
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    
    await prisma.otp.create({
        data: { email, code: otp, expiresAt: expires,},
      });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
    });

    // Optional: Save OTP to database with expiry or cache it

    return new Response(JSON.stringify({error: false,  message: 'OTP sent successfully! \n Please check your email.' }), {
      status: 200,
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return new Response(
      JSON.stringify({ error: true, message: 'Failed to send OTP. \n Please try again.' }),
      {}
    );
  }
}
