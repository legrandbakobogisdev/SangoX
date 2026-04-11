# Notification Actions - Guide de Test

## Prérequis

- Backend avec endpoint `/api/notification/actions` implémenté
- Topics Kafka `CHAT_NOTIFICATION_REPLY` et `CHAT_NOTIFICATION_MARK_READ` configurés
- App compilée et en cours d'exécution

## Test 1: Action "Répondre"

### Étapes:
1. Envoyer une notification de test avec `conversationId`
2. Cliquer sur "Répondre" dans la notification
3. Taper un message (ex: "Merci!")
4. Cliquer "Envoyer"

### Vérifications:
- ✅ Console: `[NotificationAction] Sending action: REPLY for conversation: ...`
- ✅ Console: `[NotificationAction] Action processed successfully: REPLY`
- ✅ Backend: Endpoint `/api/notification/actions` reçoit la requête
- ✅ Backend: Event Kafka `CHAT_NOTIFICATION_REPLY` est publié
- ✅ Chat: Le message apparaît dans la conversation
- ✅ Conversation list: Le dernier message est mis à jour

### Payload Attendu:
```json
{
  "action": "REPLY",
  "conversationId": "69d5353d7f06c531510b92fa",
  "replyText": "Merci!"
}
```

## Test 2: Action "Marqué comme lu"

### Étapes:
1. Envoyer une notification de test avec `conversationId`
2. Cliquer sur "Marqué comme lu" dans la notification

### Vérifications:
- ✅ Console: `[NotificationAction] Sending action: MARK_AS_READ for conversation: ...`
- ✅ Console: `[NotificationAction] Action processed successfully: MARK_AS_READ`
- ✅ Backend: Endpoint `/api/notification/actions` reçoit la requête
- ✅ Backend: Event Kafka `CHAT_NOTIFICATION_MARK_READ` est publié
- ✅ Chat: La conversation est marquée comme lue
- ✅ Notification: Disparaît après quelques secondes

### Payload Attendu:
```json
{
  "action": "MARK_AS_READ",
  "conversationId": "69d5353d7f06c531510b92fa"
}
```

## Test 3: Erreur Réseau

### Étapes:
1. Désactiver la connexion réseau
2. Cliquer sur "Répondre" et envoyer un message
3. Vérifier les logs d'erreur

### Vérifications:
- ✅ Console: `[NotificationAction] Failed to process action: ...`
- ✅ Pas de crash de l'app
- ✅ Utilisateur peut réessayer

## Test 4: Données Manquantes

### Étapes:
1. Envoyer une notification SANS `conversationId`
2. Cliquer sur "Répondre"

### Vérifications:
- ✅ Console: Pas d'appel API (conversationId manquant)
- ✅ Pas d'erreur dans les logs

## Logs à Vérifier

### Succès:
```
[NotificationAction] Sending action: REPLY for conversation: 69d5353d7f06c531510b92fa
[NotificationAction] Action processed successfully: REPLY
```

### Erreur:
```
[NotificationAction] Failed to process action: Error: Network error
```

### Action Reçue:
```
[Notification Action] reply {conversationId: "...", messageId: "..."}
```

## Debugging

### Si l'action n'est pas envoyée:
1. Vérifier que `conversationId` est dans les données de notification
2. Vérifier que `NotificationActionService` est importé
3. Vérifier les logs `[Notification Action]`

### Si l'endpoint retourne une erreur:
1. Vérifier que l'endpoint existe: `POST /api/notification/actions`
2. Vérifier le payload envoyé
3. Vérifier les logs du backend

### Si le message n'apparaît pas:
1. Vérifier que le backend a publié l'événement Kafka
2. Vérifier que chat-service reçoit l'événement
3. Vérifier que le message est bien envoyé

## Checklist de Déploiement

- [ ] Tests locaux réussis
- [ ] Tests sur iOS réussis
- [ ] Tests sur Android réussis
- [ ] Logs vérifiés
- [ ] Erreurs gérées
- [ ] Backend prêt
- [ ] Kafka topics configurés
- [ ] Notifications de test envoyées
- [ ] Monitoring en place
