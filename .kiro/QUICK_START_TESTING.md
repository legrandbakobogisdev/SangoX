# Quick Start - Tester les Actions de Notification

## 1. Vérifier que tout compile

```bash
npm run build
# ou
expo build
```

## 2. Envoyer une notification de test

### Via curl (depuis le backend):
```bash
curl -X POST http://localhost:8000/api/notification/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "69d5353d7f06c531510b92fa",
    "conversationId": "69d5353d7f06c531510b92fa",
    "title": "Alice",
    "body": "Salut, ça va?",
    "data": {
      "conversationId": "69d5353d7f06c531510b92fa",
      "messageId": "69d6448b6e093f43b4629631"
    }
  }'
```

### Via Postman:
1. POST http://localhost:8000/api/notification/test
2. Headers: Authorization: Bearer YOUR_TOKEN
3. Body (JSON):
```json
{
  "userId": "69d5353d7f06c531510b92fa",
  "conversationId": "69d5353d7f06c531510b92fa",
  "title": "Alice",
  "body": "Salut, ça va?",
  "data": {
    "conversationId": "69d5353d7f06c531510b92fa",
    "messageId": "69d6448b6e093f43b4629631"
  }
}
```

## 3. Tester l'action "Répondre"

### Sur l'app:
1. Recevoir la notification
2. Cliquer sur "Répondre"
3. Taper un message (ex: "Merci!")
4. Cliquer "Envoyer"

### Vérifier les logs:
```
[NotificationAction] Sending action: REPLY for conversation: 69d5353d7f06c531510b92fa
[NotificationAction] Action processed successfully: REPLY
```

### Vérifier le backend:
```
POST /api/notification/actions
{
  "action": "REPLY",
  "conversationId": "69d5353d7f06c531510b92fa",
  "replyText": "Merci!"
}
```

### Vérifier Kafka:
```bash
# Vérifier que l'événement est publié
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic CHAT_NOTIFICATION_REPLY \
  --from-beginning
```

## 4. Tester l'action "Marqué comme lu"

### Sur l'app:
1. Recevoir la notification
2. Cliquer sur "Marqué comme lu"

### Vérifier les logs:
```
[NotificationAction] Sending action: MARK_AS_READ for conversation: 69d5353d7f06c531510b92fa
[NotificationAction] Action processed successfully: MARK_AS_READ
```

### Vérifier le backend:
```
POST /api/notification/actions
{
  "action": "MARK_AS_READ",
  "conversationId": "69d5353d7f06c531510b92fa"
}
```

## 5. Vérifier que le message apparaît

### Dans la conversation:
- Le message doit apparaître avec le statut "sent"
- Puis passer à "delivered" puis "read"

### Dans la conversation list:
- Le dernier message doit être mis à jour
- Le statut doit être visible

## 6. Debugging

### Si l'action n'est pas envoyée:
```bash
# Vérifier les logs de l'app
# Chercher: [NotificationAction]
# Chercher: [Notification Action]
```

### Si l'endpoint retourne une erreur:
```bash
# Vérifier les logs du backend
# Vérifier que l'endpoint existe
# Vérifier le payload
```

### Si le message n'apparaît pas:
```bash
# Vérifier que le Socket est connecté
# Vérifier que l'événement Kafka est publié
# Vérifier que chat-service reçoit l'événement
```

## 7. Logs Importants

### Client:
```
[NotificationAction] Sending action: ...
[NotificationAction] Action processed successfully: ...
[NotificationAction] Failed to process action: ...
[Notification Action] reply ...
[Notification Action] markAsRead ...
```

### Backend:
```
POST /api/notification/actions
Kafka: CHAT_NOTIFICATION_REPLY
Kafka: CHAT_NOTIFICATION_MARK_READ
```

## 8. Checklist Rapide

- [ ] App compile sans erreur
- [ ] Notification reçue
- [ ] Action "Répondre" fonctionne
- [ ] Action "Marqué comme lu" fonctionne
- [ ] Message apparaît dans la conversation
- [ ] Conversation marquée comme lue
- [ ] Logs vérifiés
- [ ] Backend reçoit les actions
- [ ] Kafka events publiés
- [ ] Pas d'erreur dans les logs

## 9. Commandes Utiles

### Voir les logs de l'app:
```bash
expo logs
# ou
adb logcat | grep NotificationAction
```

### Voir les logs du backend:
```bash
docker logs notification-service
docker logs chat-service
```

### Voir les événements Kafka:
```bash
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic CHAT_NOTIFICATION_REPLY \
  --from-beginning

kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic CHAT_NOTIFICATION_MARK_READ \
  --from-beginning
```

## 10. Troubleshooting

### Notification ne s'affiche pas:
- Vérifier les permissions
- Vérifier que le token FCM est valide
- Vérifier que l'app est en arrière-plan

### Action ne s'envoie pas:
- Vérifier que conversationId est dans les données
- Vérifier que NotificationActionService est importé
- Vérifier les logs [NotificationAction]

### Message n'apparaît pas:
- Vérifier que le Socket est connecté
- Vérifier que l'événement Kafka est publié
- Vérifier que chat-service reçoit l'événement

### Erreur réseau:
- Vérifier la connexion
- Vérifier que le backend est accessible
- Vérifier les logs d'erreur
