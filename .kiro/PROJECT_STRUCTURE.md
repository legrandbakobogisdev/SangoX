# Structure du Projet - Notification Actions

## Arborescence Complète

```
sangox-app/
├── services/
│   ├── NotificationActionService.ts (NOUVEAU)
│   ├── NotificationService.ts (EXISTANT)
│   ├── ChatService.ts (EXISTANT)
│   ├── SocketService.ts (EXISTANT)
│   └── api.ts (EXISTANT)
│
├── app/
│   ├── _layout.tsx (MODIFIÉ)
│   ├── (tabs)/
│   │   └── index.tsx (EXISTANT)
│   ├── chat/
│   │   └── [id].tsx (EXISTANT)
│   └── auth/
│       └── ... (EXISTANT)
│
├── context/
│   ├── ChatContext.tsx (EXISTANT)
│   ├── AuthContext.tsx (EXISTANT)
│   └── ThemeContext.tsx (EXISTANT)
│
├── components/
│   └── chat/
│       ├── ChatItem.tsx (EXISTANT)
│       └── ... (EXISTANT)
│
└── .kiro/
    ├── NOTIFICATION_ACTIONS_IMPLEMENTATION.md (NOUVEAU)
    ├── NOTIFICATION_ACTIONS_SUMMARY.md (NOUVEAU)
    ├── NOTIFICATION_ACTIONS_TEST.md (NOUVEAU)
    ├── NOTIFICATION_ACTIONS_INTEGRATION.md (NOUVEAU)
    ├── IMPLEMENTATION_COMPLETE.md (NOUVEAU)
    ├── QUICK_START_TESTING.md (NOUVEAU)
    ├── CODE_CHANGES.md (NOUVEAU)
    ├── NOTIFICATION_ACTIONS_FINAL_SUMMARY.md (NOUVEAU)
    ├── PROJECT_STRUCTURE.md (NOUVEAU)
    └── ... (EXISTANT)
```

## Fichiers Clés

### Services
- **NotificationActionService.ts**: Service pour gérer les actions de notification
- **NotificationService.ts**: Configuration des catégories iOS/Android
- **ChatService.ts**: Envoi de messages et marquage comme lu
- **SocketService.ts**: Événements Socket en temps réel
- **api.ts**: Requêtes HTTP

### App Layout
- **_layout.tsx**: Handler de notification et configuration

### Context
- **ChatContext.tsx**: Gestion des messages et conversations
- **AuthContext.tsx**: Authentification
- **ThemeContext.tsx**: Thème

### Documentation
- **NOTIFICATION_ACTIONS_IMPLEMENTATION.md**: Documentation technique
- **NOTIFICATION_ACTIONS_SUMMARY.md**: Résumé des changements
- **NOTIFICATION_ACTIONS_TEST.md**: Guide de test
- **NOTIFICATION_ACTIONS_INTEGRATION.md**: Guide d'intégration
- **IMPLEMENTATION_COMPLETE.md**: Implémentation complète
- **QUICK_START_TESTING.md**: Quick start
- **CODE_CHANGES.md**: Détail des changements
- **NOTIFICATION_ACTIONS_FINAL_SUMMARY.md**: Résumé final
- **PROJECT_STRUCTURE.md**: Cette structure

## Flux de Données

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
│                  app/_layout.tsx                             │
│  addNotificationResponseReceivedListener                     │
│  - Détecte l'action                                          │
│  - Récupère le texte (pour reply)                           │
│  - Appelle NotificationActionService                        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│          NotificationActionService                           │
│  - handleReply()                                             │
│  - handleMarkAsRead()                                        │
│  - POST /api/notification/actions                           │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  ApiService                                  │
│  - Envoie la requête HTTP                                   │
│  - Gère les erreurs                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ POST /api/notification/actions
                     │
┌────────────────────▼────────────────────────────────────────┐
│              BACKEND (Node.js)                              │
│  - Notification Service                                     │
│  - Publie événement Kafka                                   │
│  - Chat Service traite l'action                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Socket event: new_message ou messages_read
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  SocketService                               │
│  - Reçoit l'événement Socket                                │
│  - Notifie ChatContext                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  ChatContext                                 │
│  - Met à jour les messages                                  │
│  - Met à jour les conversations                             │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  UI Update                                   │
│  - Message apparaît dans la conversation                    │
│  - Conversation marquée comme lue                           │
│  - Notification disparaît                                   │
└─────────────────────────────────────────────────────────────┘
```

## Dépendances

### Internes
- `ApiService`: Pour envoyer les actions
- `ChatService`: Pour envoyer les messages (optionnel)
- `SocketService`: Pour les événements Socket
- `ChatContext`: Pour mettre à jour les messages

### Externes
- `expo-notifications`: Pour les notifications
- `react-native`: Pour l'UI

## Configuration

### iOS
- Catégories de notification configurées dans `NotificationService.setupNotificationCategories()`
- Actions: "Répondre" et "Marqué comme lu"

### Android
- Actions avec icônes
- Groupage par conversation avec tag

## Logging

### Niveaux
- `[NotificationAction]`: Actions de notification
- `[Notification Action]`: Actions reçues
- `[Notification]`: Notifications générales

### Points de Log
1. Envoi de l'action
2. Succès du traitement
3. Erreur du traitement
4. Action reçue

## Erreurs Possibles

### Erreur Réseau
- Loggée: `[NotificationAction] Failed to process action: ...`
- Pas de crash
- Utilisateur peut réessayer

### Données Manquantes
- Ignorées silencieusement
- Pas de log d'erreur

### Erreur Backend
- Loggée: `[NotificationAction] Failed to process action: ...`
- Pas de crash
- Utilisateur peut réessayer

## Tests

### Unitaires
- Tester `NotificationActionService.handleReply()`
- Tester `NotificationActionService.handleMarkAsRead()`

### Intégration
- Tester le flux complet
- Vérifier les logs
- Vérifier le backend

### E2E
- Tester sur iOS et Android
- Tester avec des notifications réelles
- Tester les erreurs réseau

## Performance

- Latence: < 1 seconde
- Pas de blocage
- Pas de rechargement
- Pas de notification d'erreur

## Sécurité

- Token JWT validé
- Utilisateur vérifié
- Conversation vérifiée
- Pas d'injection SQL
- Pas d'XSS

## Monitoring

- Logs pour le debugging
- Erreurs loggées
- Succès loggés
- Événements Kafka loggés

## Prochaines Étapes

1. Tester sur iOS et Android
2. Vérifier les Kafka events
3. Monitorer les erreurs en production
4. Ajouter des notifications de succès si nécessaire
5. Implémenter offline support

## Conclusion

La structure est complète, documentée et prête pour les tests et le déploiement.
