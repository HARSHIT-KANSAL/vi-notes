

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());

// mongodb connection
const mongodbUri = process.env.MONGODB_URI ;

mongoose.connect(mongodbUri,{dbName: 'Vi-Notes'})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('MongoDB connection error:', err.message);
  
});

// database
const sessionSchema = new mongoose.Schema({
  title: String,
  startTime: { type: Date, default: Date.now },
  pasteStats: {
    totalPasteEvents: { type: Number, default: 0 },
    totalCharactersPasted: { type: Number, default: 0 }
  }
});

const pasteEventSchema = new mongoose.Schema({
  sessionId: mongoose.Schema.Types.ObjectId,
  content: String,
  charCount: Number,
  time: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema);
const PasteEvent = mongoose.model('PasteEvent', pasteEventSchema);



//create new session
app.post('/api/sessions', async (req, res) => {
  try {
    const session = new Session({
      title: 'Vi-Notes Session'
    });

    await session.save();
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// save  paste event
app.post('/api/sessions/:sessionId/paste-event', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Invalid content' });
    }

    const pasteEvent = new PasteEvent({
      sessionId: req.params.sessionId,
      content: content,
      charCount: content.length
    });

    await pasteEvent.save();

    // update session stats
    await Session.findByIdAndUpdate(
      req.params.sessionId,
      {
        $inc: {
          'pasteStats.totalPasteEvents': 1,
          'pasteStats.totalCharactersPasted': content.length
        }
      }
    );

    res.json(pasteEvent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get session details
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    const pasteEvents = await PasteEvent.find({ sessionId: req.params.sessionId });

    res.json({
      session,
      pasteEvents,
      totalEvents: pasteEvents.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// serve the editor
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'editor.html'));
});

// Connection check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', database: dbStatus });
});

// start server

app.listen(PORT, () => {
  console.log('Vi-Notes Editor Server');
  console.log(`Server running on Port: ${PORT}`);
});
