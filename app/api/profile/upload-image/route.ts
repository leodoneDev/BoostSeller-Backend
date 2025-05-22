
import { writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST(req: Request) {
  
    const formData = await req.formData();
    const file  = formData.get("profile_image") as File | null;
    const userId = formData.get("userId")?.toString();
    if(!file || !userId) {
        return new Response(JSON.stringify({
            error: true,
            message: 'File is not correct picked. Please try again.' 
        }));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name}`;
    
    // const uploadDir = path.join(process.cwd(), '/public/uploads/images/profiles');
    const uploadDir = path.join(process.cwd(), 'uploads', 'images', 'profiles');


    // Ensure upload folder exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const imageUrl = `/uploads/images/profiles/${filename}`;

    // update user table

    try {
        await prisma.user.update({
            where: {
                id: parseInt(userId)
            },
            data: {
                avatarPath: imageUrl,
            },
        });

        return new Response(JSON.stringify({
            error: false,
            message: "Upload profile image successful!",
            imageUrl,
        }), {
            status: 200
        });
    } catch (err) {
        console.log(err);
        return new Response(JSON.stringify({
            error: true,
            message: "Failed to upload profile image. Please try again."
        }));
    }
}
