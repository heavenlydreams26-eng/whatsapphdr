# Security Specification - HDreams WhatsApp Neural OS

## 1. Data Invariants

1.  **User Ownership**: All data under `/users/{userId}/` strictly belongs to the user identified by `userId`. No other user (except Admins) can read or write to this path.
2.  **Verified Authentication**: All write operations (create, update, delete) require a verified email (`request.auth.token.email_verified == true`).
3.  **Entity Integrity**: 
    - `User`: `uid` must match `request.auth.uid`. `agentRole` and `agentTone` must be within allowed enums.
    - `Chat`: `unreadCount` must be non-negative.
    - `Message`: `senderId` must match `request.auth.uid` if `role == 'user'`.
    - `CRMClient`: `status` must be one of `['lead', 'active', 'delinquent', 'closed']`.
    - `Workflow`: `status` must be one of `['draft', 'active', 'archived']`.
4.  **Immutability**:
    - `createdAt` and `uid` fields must never change after creation.
    - `senderId` and `role` in `Message` are immutable.
5.  **Relational Consistency**:
    - A message cannot be created in a chat that doesn't exist (relational sync).
    - A ticket message cannot be created for a ticket that doesn't exist.

## 2. The "Dirty Dozen" Payloads (Attack Vectors)

| ID | Goal | Path | Payload | Expected Result |
|----|------|------|---------|-----------------|
| D1 | Identity Spoofing (Create User) | `/users/victim_uid` | `{"uid": "attacker_uid", "displayName": "Attacker"}` | PERMISSION_DENIED |
| D2 | Identity Spoofing (Write Chat) | `/users/victim_uid/chats/chat1` | `{"contactName": "Hacked"}` | PERMISSION_DENIED |
| D3 | Privilege Escalation (User) | `/users/uid` | `{"isAdmin": true}` | PERMISSION_DENIED (if field exists, or via schema lock) |
| D4 | Value Poisoning (CRM Status) | `/users/uid/crm_clients/c1` | `{"status": "superuser", "name": "Evil"}` | PERMISSION_DENIED |
| D5 | Denial of Wallet (Size Attack) | `/users/uid/protocols/p1` | `{"name": "A" * 1000000}` | PERMISSION_DENIED |
| D6 | ID Poisoning | `/users/uid/chats/` + "A" * 1024 | `{"contactName": "TooLongID"}` | PERMISSION_DENIED |
| D7 | Unverified Write | `/users/uid` | `{"displayName": "New Name"}` (with unverified email) | PERMISSION_DENIED |
| D8 | Immutable Field Change | `/users/uid` | `{"createdAt": "2000-01-01"}` | PERMISSION_DENIED |
| D9 | Orphaned Write (Message) | `/users/uid/chats/non_existent/messages/m1` | `{"text": "Hello"}` | PERMISSION_DENIED |
| D10| Shadow Update (Ghost Field) | `/users/uid/crm_clients/c1` | `{"name": "John", "ghost": "extra_data"}` | PERMISSION_DENIED |
| D11| PII Leak (Read Profile) | `/users/victim_uid` | `get()` as different user | PERMISSION_DENIED |
| D12| Negative Count Poisoning | `/users/uid/chats/c1` | `{"unreadCount": -5}` | PERMISSION_DENIED |

## 3. Test Scenarios

- **Authenticated but not owner**: Try to list chats for another user.
- **Valid Owner, Unverified**: Try to update own profile.
- **Valid Owner, Verified**: Perform standard operations.
- **Schema Validation**: Create CRM client with missing required fields.
- **Terminal State**: Update a 'closed' CRM client (if terminal state locking is requested, usually status 'closed' might be terminal).
