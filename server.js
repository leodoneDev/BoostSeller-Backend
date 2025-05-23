const { createServer } = require('http');
const next = require('next');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const url = require('url');
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const { sendPushNotification } = require('./firebase');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

app.prepare().then(() => {

  // const server = createServer((req, res) => {
  //   handle(req, res);
  // });

const server = createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Serve files from /uploads
  if (pathname.startsWith('/uploads')) {
    const filePath = path.join(__dirname, pathname);
      
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
      return;
    }

    // Default next.js handler
    handle(req, res);
  });

  
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const clients = new Map(); // Map userId => socket

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('register', (userId) => {
      if (clients.has(userId)) {
        console.log(`User ${userId} was already connected. Replacing old socket.`);
      } else {
        clients.set(userId, socket);
        console.log(`Registered user ${userId} with socket ${socket.id}`);
      }
      
    });

    socket.on('lead_added', async (data) => {

      // find top rank performer
      const assignedPerfomer = await prisma.performer.findFirst({
        orderBy: {
          score: 'desc',
        },
        where: {
          available: true,
        },
      });
      const performerId = assignedPerfomer.userId.toString();

      // socket that correspond to assigned performer
      const performerSocket = clients.get(performerId);
      
      const lead = await prisma.lead.update({
        where: {
          id: data.id,
        },
        data: {
          assignedTo: assignedPerfomer.id,
          status: "assigned",
          assignedAt: new Date(),
        },
      });

      console.log(performerId);

      const notification = await prisma.notification.create({
        data: {
          receiveId: parseInt(performerId),
          title: 'New lead is assigned',
          message: data.name + ' is assigned to you.',
          isRead: false,
        },
      });

      if (performerSocket) {
        
        performerSocket.emit('lead_notification', {
          lead: data,
          message: 'A new lead - ' + data.name + 'has been assigned to you.',
          notification: notification,
        });
        
      } else {
        
        const user = await prisma.user.findUnique({
          where: {
            id: assignedPerfomer.userId,
          },
          
        });

        const deviceToken = user.fcmToken;
        console.log(deviceToken);
        sendPushNotification(deviceToken, assignedPerfomer);
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, s] of clients.entries()) {
        if (s.id === socket.id) clients.delete(userId);
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`> Ready on http://0.0.0.0:${PORT}`);
  });


});



