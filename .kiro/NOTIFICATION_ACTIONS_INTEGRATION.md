# Notification Actions - Guide d'Intégration Complète

## Vue d'Ensemble

Le système d'actions de notification permet aux utilisateurs de répondre ou marquer comme lu directement depuis la notification, sans ouvrir l'app.

## Architecture Complète

```
┌─────────────────────────────────────────────────────────────┐
│                    UTILISATEUR                              │
│              Reçoit une notification                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─ Clique "Répondre"
                     │  ou "Marqué comme lu"
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  CLIENT (React Native)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ addNotificationResponseReceivedListener              │   │
│  │ - Détecte l'action (reply/markAsRead)               │   │
│  │ - Récupère le texte (pour reply)                    │   │
│  │ - Appelle NotificationActionService                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │ NotificationActionService                           │   │
│  │ - handleReply(conversationId, replyText)            │   │
│  │ - handleMarkAsRead(conversationId)                  │   │
│  │ - Envoie POST /api/notification/actions             │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ POST /api/notification/actions
                     │ {
                     │   action: 'REPLY' | 'MARK_AS_READ',
                     │   conversationId: '...',
                     │   replyText?: '...'
                     │ }
                     │
┌────────────────────▼────────────────────────────────────────┐
│              BACKEND (Node.js)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Notification Service                                │   │
│  │ - POST /api/notification/actions                    │   │
│  │ - Valide l'action                                   │   │
│  │ - Publie événement Kafka                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │ Kafka Topics                                        │   │
│  │ - CHAT_NOTIFICATION_REPLY                           │   │
│  │ - CHAT_NOTIFICATION_MARK_READ                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │ Chat Service                                        │   │
│  │ - Reçoit l'événement Kafka                          │   │
│  │ - Pour REPLY: Envoie le message                     │   │
│  │ - Pour MARK_READ: Marque la conversation comme lue │   │
│  │ - Émet Socket event au client                       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Socket event: new_message ou messages_read
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  CLIENT (React Native)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ChatContext                                         │   │
│  │ - Reçoit le Socket event                            │   │
│  │ - Met à jour les messages                           │   │
│  │ - Met à jour la conversation list                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │ UI Update                                           │   │
│  │ - Message apparaît dans la conversation             │   │
│  │ - Conversation marquée comme lue                    │   │
│  │ - Notification disparaît                            │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

## Flux Détaillé

### 1. Réception de la Notification

```typescript
// Backend envoie une notification avec:
{
  title: "Alice",
  body: "Salut, ça va?",
  data: {
    conversationId: "69d5353d7f06c531510b92fa",
    messageId: "69d6448b6e093f43b4629631",
    senderId: "user123"
  }
}
```

### 2. Utilisateur Clique sur "Répondre"

```typescript
// NotificationService.setupNotificationCategories() configure:
{
  identifier: 'reply',
  buttonTitle: 'Répondre',
  textInput: {
    submitButtonTitle: 'Envoyer',
    placeholder: 'Votre message...'
  }
}
```

### 3. App Reçoit la Réponse

```typescript
// app/_layout.tsx
Notifications.addNotificationResponseReceivedListener((response) => {
  const { actionIdentifier, notification } = response;
  const userText = response.userText; // "Merci!"
  const data = notification.request.content.data;
  
  if (actionIdentifier === 'reply') {
    NotificationActionService.handleReply(
      data.conversationId,
      userText,
      data.messageId
    );
  }
});
```

### 4. Service Envoie l'Action

```typescript
// NotificationActionService.handleReply()
await ApiService.post('/api/notification/actions', {
  action: 'REPLY',
  conversationId: '69d5353d7f06c531510b92fa',
  messageId: '69d6448b6e093f43b4629631',
  replyText: 'Merci!'
});
```

### 5. Backend Traite l'Action

```javascript
// notification-service
POST /api/notification/actions
{
  action: 'REPLY',
  conversationId: '69d5353d7f06c531510b92fa',
  replyText: 'Merci!'
}

// Publie l'événement Kafka
kafka.publish('CHAT_NOTIFICATION_REPLY', {
  conversationId: '69d5353d7f06c531510b92fa',
  userId: 'user123',
  messageText: 'Merci!',
  timestamp: new Date()
});
```

### 6. Chat Service Traite l'Événement

```javascript
// chat-service reçoit CHAT_NOTIFICATION_REPLY
// Envoie le message
const message = await Message.create({
  conversationId: '69d5353d7f06c531510b92fa',
  senderId: 'user123',
  content: 'Merci!',
  type: 'text'
});

// Émet Socket event
io.to(conversationId).emit('new_message', message);
```

### 7. Client Reçoit le Message

```typescript
// ChatContext
SocketService.on('new_message', (message) => {
  setMessages(prev => [...prev, message]);
  setConversations(prev => prev.map(c =>
    c._id === message.conversationId
      ? { ...c, lastMessage: message }
      : c
  ));
});
```

### 8. UI se Met à Jour

- Message apparaît dans la conversation
- Conversation list se met à jour
- Notification disparaît

## Intégration avec le Système Existant

### ChatContext
- Reçoit les messages via Socket
- Met à jour les messages et conversations
- Gère les statuts (sent, delivered, read)

### NotificationService
- Configure les catégories iOS/Android
- Gère les permissions
- Reçoit les tokens FCM

### SocketService
- Émet les événements Socket
- Reçoit les messages en temps réel
- Gère la connexion

### ApiService
- Envoie les actions au backend
- Gère les erreurs réseau
- Retry automatique

## Gestion des Erreurs

### Erreur Réseau
```typescript
try {
  await NotificationActionService.handleReply(...);
} catch (error) {
  console.error('[NotificationAction] Failed to process action:', error);
  // Pas de notification d'erreur (silencieux)
  // Utilisateur peut réessayer
}
```

### Données Manquantes
```typescript
if (userText && data?.conversationId) {
  // Envoyer l'action
} else {
  // Ignorer silencieusement
  console.log('[Notification] Missing data for action');
}
```

## Performance

- **Latence**: < 1 seconde (réseau + backend)
- **Pas de blocage**: Action envoyée en arrière-plan
- **Pas de rechargement**: Message apparaît via Socket
- **Pas de notification d'erreur**: Silencieux en cas d'erreur

## Sécurité

- ✅ Token JWT validé
- ✅ Utilisateur vérifié
- ✅ Conversation vérifiée
- ✅ Pas d'injection SQL (MongoDB)
- ✅ Pas d'XSS (données validées)

## Monitoring

Logs à surveiller:
- `[NotificationAction] Sending action:` - Action envoyée
- `[NotificationAction] Failed to process action:` - Erreur
- Backend logs pour les événements Kafka

## Prochaines Améliorations

1. Notification de succès/erreur
2. Retry automatique en cas d'erreur
3. Offline support (queue local)
4. Réactions emoji depuis la notification
5. Forwarding depuis la notification
