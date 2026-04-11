# Backend Integration - Notification Actions

## Endpoint Requis

### POST /api/notification/actions

Reçoit les actions de notification du client.

#### Request
```json
{
  "action": "REPLY" | "MARK_AS_READ",
  "conversationId": "string",
  "messageId": "string (optional)",
  "replyText": "string (optional, required for REPLY)"
}
```

#### Response
```json
{
  "success": true,
  "message": "Action processed successfully"
}
```

#### Erreurs
```json
{
  "success": false,
  "error": "Invalid action"
}
```

## Validation

### Pour REPLY
- ✅ action === 'REPLY'
- ✅ conversationId existe
- ✅ replyText n'est pas vide
- ✅ Utilisateur a accès à la conversation

### Pour MARK_AS_READ
- ✅ action === 'MARK_AS_READ'
- ✅ conversationId existe
- ✅ Utilisateur a accès à la conversation

## Kafka Topics

### CHAT_NOTIFICATION_REPLY
Publié quand l'utilisateur répond depuis la notification.

```json
{
  "conversationId": "69d5353d7f06c531510b92fa",
  "userId": "user123",
  "messageText": "Merci!",
  "timestamp": "2026-04-08T10:30:00Z"
}
```

### CHAT_NOTIFICATION_MARK_READ
Publié quand l'utilisateur marque comme lu depuis la notification.

```json
{
  "conversationId": "69d5353d7f06c531510b92fa",
  "userId": "user123",
  "timestamp": "2026-04-08T10:30:00Z"
}
```

## Chat Service

### Traitement de CHAT_NOTIFICATION_REPLY

```javascript
// Reçoit l'événement Kafka
kafka.subscribe('CHAT_NOTIFICATION_REPLY', async (event) => {
  const { conversationId, userId, messageText } = event;
  
  // 1. Créer le message
  const message = await Message.create({
    conversationId,
    senderId: userId,
    content: messageText,
    type: 'text'
  });
  
  // 2. Émettre Socket event
  io.to(conversationId).emit('new_message', message);
  
  // 3. Mettre à jour la conversation
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message,
    updatedAt: new Date()
  });
});
```

### Traitement de CHAT_NOTIFICATION_MARK_READ

```javascript
// Reçoit l'événement Kafka
kafka.subscribe('CHAT_NOTIFICATION_MARK_READ', async (event) => {
  const { conversationId, userId } = event;
  
  // 1. Marquer tous les messages comme lus
  await Message.updateMany(
    { conversationId },
    { status: 'read', isRead: true }
  );
  
  // 2. Émettre Socket event
  io.to(conversationId).emit('messages_read', {
    conversationId,
    readerId: userId
  });
  
  // 3. Mettre à jour la conversation
  await Conversation.findByIdAndUpdate(conversationId, {
    unreadCounts: { [userId]: 0 }
  });
});
```

## Implémentation Complète

### notification-service/routes/notification.routes.js

```javascript
router.post('/actions', async (req, res) => {
  try {
    const { action, conversationId, messageId, replyText } = req.body;
    const userId = req.user._id;
    
    // Validation
    if (!action || !conversationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (action === 'REPLY' && !replyText) {
      return res.status(400).json({ error: 'replyText required for REPLY action' });
    }
    
    // Vérifier l'accès à la conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Publier l'événement Kafka
    if (action === 'REPLY') {
      await kafka.publish('CHAT_NOTIFICATION_REPLY', {
        conversationId,
        userId,
        messageText: replyText,
        timestamp: new Date()
      });
    } else if (action === 'MARK_AS_READ') {
      await kafka.publish('CHAT_NOTIFICATION_MARK_READ', {
        conversationId,
        userId,
        timestamp: new Date()
      });
    }
    
    res.json({ success: true, message: 'Action processed successfully' });
  } catch (error) {
    console.error('Error processing notification action:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Logs à Vérifier

### Succès
```
POST /api/notification/actions
{
  "action": "REPLY",
  "conversationId": "69d5353d7f06c531510b92fa",
  "replyText": "Merci!"
}

Kafka: Publishing CHAT_NOTIFICATION_REPLY
{
  "conversationId": "69d5353d7f06c531510b92fa",
  "userId": "user123",
  "messageText": "Merci!",
  "timestamp": "2026-04-08T10:30:00Z"
}

Chat Service: Received CHAT_NOTIFICATION_REPLY
Creating message...
Emitting Socket event: new_message
```

### Erreur
```
POST /api/notification/actions
Error: Missing required fields
Error: Access denied
Error: Internal server error
```

## Tests

### Test 1: Reply
```bash
curl -X POST http://localhost:8000/api/notification/actions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "action": "REPLY",
    "conversationId": "69d5353d7f06c531510b92fa",
    "replyText": "Merci!"
  }'
```

### Test 2: Mark as Read
```bash
curl -X POST http://localhost:8000/api/notification/actions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "action": "MARK_AS_READ",
    "conversationId": "69d5353d7f06c531510b92fa"
  }'
```

## Monitoring

### Métriques à Surveiller
- Nombre de requêtes par action
- Latence moyenne
- Taux d'erreur
- Nombre de messages envoyés via notification
- Nombre de conversations marquées comme lues

### Logs à Surveiller
- `POST /api/notification/actions`
- `Kafka: Publishing CHAT_NOTIFICATION_REPLY`
- `Kafka: Publishing CHAT_NOTIFICATION_MARK_READ`
- Erreurs de validation
- Erreurs d'accès

## Prochaines Étapes

1. Implémenter l'endpoint
2. Configurer les Kafka topics
3. Implémenter les handlers Kafka
4. Tester avec le client
5. Monitorer en production

## Conclusion

L'intégration backend est simple et directe. L'endpoint reçoit les actions, valide les données, et publie les événements Kafka pour que chat-service les traite.
