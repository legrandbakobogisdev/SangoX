# Notification Actions Implementation

## Overview
Implémentation complète du système d'actions de notification (Reply et Mark as Read) côté client et backend.

## Architecture

### Backend (Déjà implémenté)
1. **Endpoint**: `POST /api/notification/actions`
   - Reçoit les actions de notification
   - Valide l'action (REPLY ou MARK_AS_READ)
   - Publie un événement Kafka

2. **Topics Kafka**:
   - `CHAT_NOTIFICATION_REPLY`: Pour les réponses depuis les notifications
   - `CHAT_NOTIFICATION_MARK_READ`: Pour marquer comme lu depuis les notifications

3. **Flux Backend**:
   - Notification-service reçoit l'action
   - Publie l'événement Kafka
   - Chat-service reçoit et traite (envoie le message ou marque comme lu)

### Client (Implémenté)

#### 1. NotificationActionService (`services/NotificationActionService.ts`)
Service centralisé pour gérer les actions de notification:
- `handleNotificationAction()`: Envoie l'action au backend
- `handleReply()`: Traite les réponses
- `handleMarkAsRead()`: Marque comme lu

#### 2. Notification Categories (`services/NotificationService.ts`)
Catégories iOS/Android configurées:
- **Reply**: Action avec champ texte
  - Identifier: `reply`
  - Titre: "Répondre"
  - Placeholder: "Votre message..."
  
- **Mark as Read**: Action simple
  - Identifier: `markAsRead`
  - Titre: "Marqué comme lu"

#### 3. Notification Response Handler (`app/_layout.tsx`)
Écoute les réponses aux actions:
- Détecte l'action (reply ou markAsRead)
- Récupère le texte de la réponse (pour reply)
- Appelle `NotificationActionService`
- Envoie l'action au backend

## Flux Complet

### Scénario 1: Répondre depuis la notification
```
1. Utilisateur reçoit notification
2. Clique sur "Répondre"
3. Tape le message
4. Clique "Envoyer"
5. App appelle: POST /api/notification/actions
   {
     action: 'REPLY',
     conversationId: '...',
     replyText: 'Mon message'
   }
6. Backend publie CHAT_NOTIFICATION_REPLY
7. Chat-service envoie le message
8. Message apparaît dans la conversation
```

### Scénario 2: Marquer comme lu depuis la notification
```
1. Utilisateur reçoit notification
2. Clique sur "Marqué comme lu"
3. App appelle: POST /api/notification/actions
   {
     action: 'MARK_AS_READ',
     conversationId: '...'
   }
4. Backend publie CHAT_NOTIFICATION_MARK_READ
5. Chat-service marque la conversation comme lue
6. Notification disparaît
```

## Données Passées dans la Notification

La notification doit contenir:
```javascript
{
  conversationId: '...',  // ID de la conversation
  messageId: '...',       // ID du message (optionnel)
  // autres données...
}
```

## Logging

Tous les événements sont loggés:
- `[NotificationAction] Sending action:` - Action envoyée
- `[NotificationAction] Action processed successfully:` - Succès
- `[NotificationAction] Failed to process action:` - Erreur
- `[Notification Action]` - Action reçue dans le handler

## Gestion des Erreurs

Si l'action échoue:
1. L'erreur est loggée
2. L'utilisateur peut réessayer
3. Pas de notification d'erreur (silencieux)

## Configuration iOS

Les catégories de notification sont configurées automatiquement au démarrage:
```typescript
NotificationService.setupNotificationCategories()
```

## Configuration Android

Android utilise les actions définies dans le backend:
- Actions avec icônes
- Groupage par conversation avec tag

## Tests

Pour tester les actions:

1. **Envoyer une notification de test**:
```bash
curl -X POST http://localhost:8000/api/notification/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "...",
    "conversationId": "...",
    "title": "Test",
    "body": "Message de test"
  }'
```

2. **Vérifier les logs**:
   - Chercher `[NotificationAction]` dans la console
   - Vérifier que l'action est envoyée au backend

3. **Vérifier le backend**:
   - Vérifier que l'endpoint reçoit la requête
   - Vérifier que l'événement Kafka est publié
   - Vérifier que le message est envoyé/marqué comme lu

## Fichiers Modifiés

1. `services/NotificationActionService.ts` - Nouveau service
2. `app/_layout.tsx` - Mise à jour du handler de notification
3. `services/NotificationService.ts` - Déjà configuré

## Prochaines Étapes

1. Tester les actions sur iOS et Android
2. Vérifier que les messages sont bien envoyés
3. Vérifier que les conversations sont marquées comme lues
4. Ajouter des notifications de succès/erreur si nécessaire
