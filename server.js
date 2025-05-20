
const { createServer } = require('http');
const next = require('next');
const socketIo = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const { sendPushNotification } = require('./firebase');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

app.prepare().then(() => {
  const server = createServer((req, res) => {
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
      clients.set(userId, socket);
      console.log(`Registered user ${userId}`);
    });

    socket.on('lead_added', async (data) => {
      const assignedPerfomer = await prisma.performer.findFirst({
        orderBy: {
          score: 'desc',
        },
        where: {
          available: true,
        },
      });
      const performerId = assignedPerfomer.id.toString();
      console.log(assignedPerfomer);
      const performerSocket = clients.get(performerId);
      console.log(data);
      
      if (performerSocket) {
        
        performerSocket.emit('lead_notification', {
          lead: data.lead,
          message: 'A new lead has been assigned to you.',
        });
        
      } else {
        
        const user = await prisma.user.findUnique({
          where: {
            id: assignedPerfomer.userId,
          },
        });
        console.log(user);
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

  server.listen(3000, '0.0.0.0', () => {
      console.log('> Ready on http://0.0.0.0:3000');
  });
});



